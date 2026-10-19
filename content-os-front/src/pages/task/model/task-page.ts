import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, reactive, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  deliverableStatuses,
  dueHint,
  fileSizeLabel,
  formatDueDate,
  taskKeys,
  toContentFile,
} from '@/entities/deliverable'
import { useSessionStore } from '@/entities/session'
import { shootKeys } from '@/entities/shoot'
import { toApiError, uploadFile } from '@/shared/api'
import {
  IMAGE_ACCEPT,
  isVideo,
  tooLarge,
  tooLargeMessage,
  uploadAll,
  usePickedFiles,
  type PickedFile,
  VIDEO_ACCEPT,
} from '@/shared/lib'
import { toast } from '@/shared/ui/toast'
import {
  addDraftFiles,
  fetchTask,
  removeDraftFile,
  saveDraft,
  submitDraft,
  type TaskDetails,
} from '../api/task'
import {
  failedUploadsMessage,
  toVersions,
  uploadFailure,
  uploadPercent,
  type ContentFile,
  type UploadFailure,
} from './task'

export const contentAccept = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`

// Same limit as the backend (TaskDraftTitle.title).
export const VERSION_TITLE_MAX = 100

export function rejectedFilesMessage(count: number): string {
  return count === 1
    ? 'This file is not an image or a video.'
    : `${count} files are not images or videos.`
}

// The task page (Figma "My tasks / Creator / View task"): the task, its product
// and details, and the Ready content versions. The assignee uploads; the art
// director sees the same page without uploads (docs/adr/0012).
export function useTaskPage(id: MaybeRefOrGetter<string>) {
  const session = useSessionStore()
  const queryCache = useQueryCache()

  const {
    data: task,
    error,
    isLoading,
  } = useQuery({
    key: () => taskKeys.detail(toValue(id)),
    query: () => fetchTask(toValue(id)),
    meta: { toast: false },
  })

  const status = computed(() => (task.value ? deliverableStatuses[task.value.status] : null))
  const dueDate = computed(() => {
    const iso = task.value?.due_date
    return iso ? { label: formatDueDate(iso), hint: dueHint(iso, new Date()) } : null
  })
  const canUpload = computed(() => task.value?.can_upload === true)
  // Only an art director sees the task of their own shoot; they edit it there.
  const canEdit = computed(() => session.me?.role === 'art_director')
  const versions = computed(() => (task.value ? toVersions(task.value.versions) : []))
  // Files of the next version, not yet submitted.
  const draftFiles = computed(() => task.value?.draft?.files.map(toContentFile) ?? [])

  // A version changes the task's status: My tasks, the review and the shoot show it too.
  function saved(next: TaskDetails) {
    queryCache.setQueryData(taskKeys.detail(next.id), next)
    queryCache.invalidateQueries({ key: taskKeys.all })
    queryCache.invalidateQueries({ key: shootKeys.all })
  }

  // Files being sent, after the draft's own until they land in it. Each goes on
  // its own: a failed one stays with a reason (and Retry) and the rest carry on.
  const { files: picked, add, remove: dropPicked } = usePickedFiles()
  interface Sending {
    // Sent share 0–1; `done` once the server has answered.
    share: number
    done: boolean
    // Uploaded but not in the draft yet: Retry only adds it, without sending again.
    fileId?: string
    failed?: UploadFailure
  }
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

  const { mutate: upload, isLoading: uploading } = useMutation({
    // Never throws: failures stay on their files instead of a global toast.
    mutation: async (items: PickedFile[]) => {
      const ids = (await uploadAll(items, send)).filter((fileId) => fileId !== null)
      if (!ids.length) return null
      try {
        return await addDraftFiles(toValue(id), ids)
      } catch (error) {
        const failed = uploadFailure(toApiError(error))
        for (const item of items) {
          const state = sending.get(item.id)
          if (state?.fileId) sending.set(item.id, { ...state, failed })
        }
        return null
      }
    },
    onSuccess: (next, items) => {
      if (next) {
        saved(next)
        for (const item of items) {
          if (sending.get(item.id)?.fileId) discard(item.id)
        }
      }
      const failed = items.filter((item) => sending.get(item.id)?.failed).length
      if (failed) toast.error(failedUploadsMessage(failed))
    },
  })

  // Drops a file that is sent or given up on.
  function discard(pickedId: string) {
    sending.delete(pickedId)
    dropPicked(pickedId)
  }

  function retry(pickedId: string) {
    const item = picked.value.find((entry) => entry.id === pickedId)
    if (!item || submitting.value) return
    const state = sending.get(pickedId)
    if (state) sending.set(pickedId, { ...state, failed: undefined })
    upload([item])
  }

  // Files go into the draft until it is submitted; the first ones start V1.
  function addFiles(chosen: File[]) {
    if (submitting.value) return
    const large = chosen.filter(tooLarge)
    if (large.length) toast.error(tooLargeMessage(large.length))
    const files = chosen.filter((file) => !tooLarge(file))
    if (!files.length) return
    const before = new Set(picked.value.map((item) => item.id))
    add(files)
    // The same file picked twice is skipped by `add`: send only what it took.
    upload(picked.value.filter((item) => !before.has(item.id)))
  }

  function rejectFiles(rejected: File[]) {
    toast.error(rejectedFilesMessage(rejected.length))
  }

  const { mutate: removeFile } = useMutation({
    mutation: (fileId: string) => removeDraftFile(toValue(id), fileId),
    onSuccess: saved,
  })

  // The next version's name; asked for once V1 is submitted. A saved draft
  // brings its title back, but typing before the first file isn't wiped.
  const title = ref('')
  watch(
    () => task.value?.draft?.id,
    () => {
      const saved = task.value?.draft?.title
      if (saved) title.value = saved
    },
    { immediate: true },
  )
  // Nothing left in flight or failed: a failed file is retried or removed first,
  // so the version doesn't go out without it unnoticed.
  const canSubmit = computed(
    () => draftFiles.value.length > 0 && !uploading.value && !pending.value.length,
  )

  const { mutate: saveNow, isLoading: saving } = useMutation({
    mutation: () => saveDraft(toValue(id), title.value),
    onSuccess: (next) => {
      saved(next)
      toast.success('Draft saved')
    },
  })

  // Files are in the draft as soon as they upload; Save draft keeps the title too.
  function save() {
    if (canSubmit.value && !saving.value && !submitting.value) saveNow()
  }

  const { mutate: submitNow, isLoading: submitting } = useMutation({
    mutation: () => submitDraft(toValue(id), title.value),
    onSuccess: (next) => {
      saved(next)
      title.value = ''
      toast.success('Submitted for review')
    },
  })

  function submit() {
    if (canSubmit.value && !saving.value && !submitting.value) submitNow()
  }

  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && task.value === undefined)
  const notFound = computed(() => error.value?.status === 404)

  return {
    task,
    loading,
    error,
    notFound,
    status,
    dueDate,
    canUpload,
    canEdit,
    versions,
    draftFiles,
    pending,
    uploading,
    addFiles,
    rejectFiles,
    removeFile,
    retry,
    discard,
    title,
    canSubmit,
    saving,
    save,
    submitting,
    submit,
  }
}
