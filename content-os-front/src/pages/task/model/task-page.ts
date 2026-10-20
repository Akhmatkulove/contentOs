import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, reactive, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  deliverableStatuses,
  dueHint,
  formatDueDate,
  taskKeys,
  toContentFile,
} from '@/entities/deliverable'
import { useSessionStore } from '@/entities/session'
import { shootKeys } from '@/entities/shoot'
import { toApiError } from '@/shared/api'
import { IMAGE_ACCEPT, uploadAll, type PickedFile, VIDEO_ACCEPT } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'
import {
  addDraftFiles,
  fetchTask,
  removeDraftFile,
  saveDraft,
  submitDraft,
  type TaskDetails,
} from '../api/task'
import { useContentUploads } from './content-uploads'
import { failedUploadsMessage, toVersions, uploadFailure } from './task'
import { useVersionEdit } from './version-edit'

export const contentAccept = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`

// Same limit as the backend (TaskDraftTitle.title).
export const VERSION_TITLE_MAX = 100

function rejectedFilesMessage(count: number): string {
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

  // Files being sent, after the draft's own until they land in it. Uploaded but
  // not in the draft yet, Retry only adds them, without sending again.
  const { picked, sending, pending, send, pick, discard } = useContentUploads()

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
    const fresh = pick(chosen)
    if (fresh.length) upload(fresh)
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

  // A version with requested changes, fixed in place and sent back to review.
  const edit = reactive(useVersionEdit(id, saved))
  // The version can't be fixed any more (decided meanwhile, the work approved):
  // the editor closes rather than fail on Save.
  watch([versions, canUpload], () => {
    const current = versions.value.find((version) => version.id === edit.editing)
    if (edit.editing && (!canUpload.value || !current?.needsChanges)) edit.cancel()
  })

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
    edit,
  }
}
