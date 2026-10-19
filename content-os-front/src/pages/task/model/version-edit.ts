import { useMutation, useQueryCache } from '@pinia/colada'
import { computed, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { taskKeys } from '@/entities/deliverable'
import { errorStatus } from '@/shared/api'
import { uploadAll } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'
import { editVersion, type TaskDetails } from '../api/task'
import { useContentUploads } from './content-uploads'
import { failedUploadsMessage, type ContentFile, type ContentVersion } from './task'

// Fixing a version the art director asked changes on (docs/adr/0016), one at a
// time: its files are kept or removed, new ones upload to /uploads at once.
// Save sends the files left and the version goes back to review.
export function useVersionEdit(
  taskId: MaybeRefOrGetter<string>,
  onSaved: (next: TaskDetails) => void,
) {
  const queryCache = useQueryCache()
  // The version being fixed.
  const editing = ref<string | null>(null)
  const kept = shallowRef<ContentFile[]>([])
  const { picked, sending, pending: added, send, pick, discard, clear } = useContentUploads()

  function start(version: ContentVersion) {
    cancel()
    editing.value = version.id
    kept.value = version.files
  }

  function cancel() {
    editing.value = null
    kept.value = []
    clear()
  }

  function removeKept(fileId: string) {
    kept.value = kept.value.filter((file) => file.id !== fileId)
  }

  async function upload(items: typeof picked.value) {
    await uploadAll(items, send)
    const failed = items.filter((item) => sending.get(item.id)?.failed).length
    if (failed) toast.error(failedUploadsMessage(failed))
  }

  function addFiles(chosen: File[]) {
    if (!editing.value || saving.value) return
    const fresh = pick(chosen)
    if (fresh.length) void upload(fresh)
  }

  function retry(pickedId: string) {
    const item = picked.value.find((entry) => entry.id === pickedId)
    if (!item || saving.value) return
    sending.delete(pickedId)
    void upload([item])
  }

  // The version's files after the fix: kept ones first, then the new ones.
  const fileIds = computed(() => [
    ...kept.value.map((file) => file.id),
    ...picked.value.flatMap((item) => sending.get(item.id)?.fileId ?? []),
  ])
  // Every new file is uploaded (a failed one is retried or removed first) and
  // something is left in the version.
  const canSave = computed(
    () =>
      editing.value !== null &&
      fileIds.value.length > 0 &&
      added.value.every((file) => file.progress === 100 && !file.failed),
  )

  const { mutate: saveNow, isLoading: saving } = useMutation({
    mutation: (body: { versionId: string; fileIds: string[] }) =>
      editVersion(toValue(taskId), body.versionId, body.fileIds),
    onSuccess: (next) => {
      onSaved(next)
      cancel()
      toast.success('Sent for review')
    },
    // Decided or approved meantime: the fresh task closes the editor (task-page).
    onError: (error) => {
      if (errorStatus(error) === 409)
        queryCache.invalidateQueries({ key: taskKeys.detail(toValue(taskId)) })
    },
  })

  function save() {
    if (!canSave.value || saving.value) return
    saveNow({ versionId: editing.value!, fileIds: fileIds.value })
  }

  return {
    editing,
    kept,
    added,
    start,
    cancel,
    removeKept,
    addFiles,
    retry,
    discard,
    canSave,
    saving,
    save,
  }
}
