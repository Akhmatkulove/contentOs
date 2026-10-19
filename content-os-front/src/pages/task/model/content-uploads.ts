import { computed, reactive } from 'vue'
import { fileSizeLabel } from '@/entities/deliverable'
import { toApiError, uploadFile } from '@/shared/api'
import { isVideo, tooLarge, tooLargeMessage, usePickedFiles, type PickedFile } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'
import { uploadFailure, uploadPercent, type ContentFile, type UploadFailure } from './task'

export interface Sending {
  // Sent share 0–1; `done` once the server has answered.
  share: number
  done: boolean
  // Uploaded to /uploads; Retry of a later step doesn't send it again.
  fileId?: string
  failed?: UploadFailure
}

// Files picked for a version (the draft or a version being fixed) on their way
// to /uploads. Each goes on its own: a failed one stays with a reason (and
// Retry) and the rest carry on.
export function useContentUploads() {
  const { files: picked, add, remove } = usePickedFiles()
  const sending = reactive(new Map<string, Sending>())

  const pending = computed<ContentFile[]>(() =>
    picked.value.map((item) => {
      const state = sending.get(item.id)
      return {
        id: item.id,
        name: item.file.name,
        size: fileSizeLabel(item.file.size),
        url: item.url,
        video: isVideo(item.file),
        progress: state?.failed
          ? undefined
          : uploadPercent(state?.share ?? 0, state?.done ?? false),
        failed: state?.failed,
      }
    }),
  )

  // The file's id, or null when it failed (the reason is kept in `sending`).
  async function send(item: PickedFile): Promise<string | null> {
    const known = sending.get(item.id)?.fileId
    if (known) return known
    sending.set(item.id, { share: 0, done: false })
    try {
      const file = await uploadFile(item.file, (share) =>
        sending.set(item.id, { share, done: false }),
      )
      sending.set(item.id, { share: 1, done: true, fileId: file.id })
      return file.id
    } catch (error) {
      sending.set(item.id, { share: 0, done: false, failed: uploadFailure(toApiError(error)) })
      return null
    }
  }

  // Takes the chosen files (too large ones are refused) and returns the new ones.
  function pick(chosen: File[]): PickedFile[] {
    const large = chosen.filter(tooLarge)
    if (large.length) toast.error(tooLargeMessage(large.length))
    const files = chosen.filter((file) => !tooLarge(file))
    if (!files.length) return []
    const before = new Set(picked.value.map((item) => item.id))
    add(files)
    // The same file picked twice is skipped by `add`.
    return picked.value.filter((item) => !before.has(item.id))
  }

  // Drops a file that is sent or given up on.
  function discard(pickedId: string) {
    sending.delete(pickedId)
    remove(pickedId)
  }

  function clear() {
    for (const item of picked.value) discard(item.id)
  }

  return { picked, sending, pending, send, pick, discard, clear }
}
