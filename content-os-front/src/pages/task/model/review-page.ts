import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import { computed, reactive, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { contentKeys } from '@/entities/content'
import { deliverableStatuses, dueHint, formatDueDate, taskKeys } from '@/entities/deliverable'
import { productKeys } from '@/entities/product'
import { shootKeys } from '@/entities/shoot'
import { errorStatus, type ApiError } from '@/shared/api'
import { queryParam, useQueryParams } from '@/shared/lib'
import { confirmAction } from '@/shared/ui/confirm-modal'
import { openMediaViewer } from '@/shared/ui/media-viewer'
import { toast } from '@/shared/ui/toast'
import { fetchReview, reviewVersion, sendToBrand, type DeliverableReview } from '../api/review'
import {
  approvedLabel,
  decisionSchema,
  isSent,
  lastUploaded,
  pickCreator,
  pickVersion,
  toCreators,
  waitingReason,
} from './review'

type Decision = 'approved' | 'changes_requested'

// The review of a deliverable (Figma "SCREEN:s_review Shoot / Review deliverable"):
// the art director goes through each assignee's versions, picks one by
// approving it or asks for changes, and sends the deliverable to the brand once
// everyone's work is approved (docs/adr/0015, 0016).
export function useReviewPage(id: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()

  const {
    data: review,
    error,
    isLoading,
  } = useQuery({
    key: () => taskKeys.review(toValue(id)),
    query: () => fetchReview(toValue(id)),
    meta: { toast: false },
  })

  // The picked creator lives in the URL: a link opens the same person's work.
  const { state: query } = useQueryParams({ creator: queryParam.text() })
  const creators = computed(() => (review.value ? toCreators(review.value) : []))
  const creator = computed(() => pickCreator(creators.value, query.creator))

  function selectCreator(creatorId: string) {
    query.creator = creatorId
  }

  // The version and file in the preview; both start from the latest.
  const versionId = ref<string | null>(null)
  const fileId = ref<string | null>(null)
  const version = computed(() => pickVersion(creator.value?.versions ?? [], versionId.value))
  const file = computed(
    () => version.value?.files.find((item) => item.id === fileId.value) ?? version.value?.files[0],
  )

  function selectVersion(next: string) {
    versionId.value = next
    fileId.value = null
  }

  function selectFile(next: string) {
    fileId.value = next
  }

  // The picked file fullscreen; the viewer leafs through the rest of its version.
  function openFile() {
    const files = version.value?.files ?? []
    const start = files.findIndex((item) => item.id === file.value?.id)
    if (!review.value || !version.value || start < 0) return
    openMediaViewer({
      files: files.map(({ id, url, video }) => ({ id, url, kind: video ? 'video' : 'image' })),
      start,
      title: `${review.value.name} · ${version.value.label}`,
    })
  }

  watch(
    () => creator.value?.id,
    () => {
      versionId.value = null
      fileId.value = null
    },
  )

  const sent = computed(() => (review.value ? isSent(review.value) : false))
  // Any version gets a decision, until the deliverable is sent.
  const canDecide = computed(() => !sent.value && !!version.value)
  // The creator's approved version: approving another one moves the pick there.
  const picked = computed(
    () => creator.value?.versions.find((item) => item.review === 'approved') ?? null,
  )

  // Feedback for creator: a new note each time. The one given before shows on the
  // version card; the field starts empty on every version and after a decision.
  const form = reactive({ decision: 'approved' as Decision, feedback: '' })
  const { r$ } = useRegleSchema(form, decisionSchema, { rewardEarly: true })
  const feedbackError = computed(() => r$.feedback.$errors[0] ?? '')
  function clearFeedback() {
    form.feedback = ''
    r$.$reset()
  }
  watch(() => version.value?.id, clearFeedback)

  // A decision changes statuses everywhere: My tasks, the task page and the shoot.
  // The review itself comes back in the answer: no need to fetch it again.
  function saved(next: DeliverableReview) {
    const own = taskKeys.review(next.id)
    queryCache.setQueryData(own, next)
    queryCache.invalidateQueries({
      key: taskKeys.all,
      predicate: (entry) => entry.key.join('/') !== own.join('/'),
    })
    queryCache.invalidateQueries({ key: shootKeys.all })
  }

  // Someone else got there first (already sent, author unassigned): show what is there now.
  function stale(failure: ApiError) {
    if (errorStatus(failure) === 409) {
      queryCache.invalidateQueries({ key: taskKeys.review(toValue(id)) })
    }
  }

  const {
    mutate: decideNow,
    isLoading: deciding,
    variables: decidingWith,
  } = useMutation({
    mutation: (body: { versionId: string; decision: Decision; feedback: string }) =>
      reviewVersion(toValue(id), body.versionId, {
        decision: body.decision,
        feedback: body.feedback,
      }),
    onSuccess: (next, body) => {
      saved(next)
      clearFeedback()
      toast.success(body.decision === 'approved' ? 'Approved' : 'Changes requested')
    },
    onError: stale,
  })

  async function decide(decision: Decision) {
    const target = version.value
    if (!target || !canDecide.value || deciding.value) return
    form.decision = decision
    const { valid, data } = await r$.$validate()
    if (!valid) return
    // Stay on this creator: once decided, the default pick moves to the next one waiting.
    if (creator.value) selectCreator(creator.value.id)
    decideNow({ versionId: target.id, decision: data.decision, feedback: data.feedback })
  }

  // Which button shows the spinner.
  const pending = computed<Decision | null>(() =>
    deciding.value ? (decidingWith.value?.decision ?? null) : null,
  )

  const canSend = computed(() => review.value?.can_send === true)
  // Keyed by creator: two people may share a name.
  const waiting = computed(() =>
    creators.value.flatMap((item) => {
      const reason = waitingReason(item)
      return reason ? [{ id: item.id, reason }] : []
    }),
  )
  const progress = computed(() => approvedLabel(creators.value))

  const { mutate: sendNow, isLoading: sending } = useMutation({
    mutation: () => sendToBrand(toValue(id)),
    onSuccess: (next) => {
      saved(next)
      // The approved files are on the content page now (docs/adr/0025), and the
      // product's order counts as sent on its card (docs/adr/0027).
      queryCache.invalidateQueries({ key: contentKeys.all })
      queryCache.invalidateQueries({ key: productKeys.lists })
      toast.success('Sent to the brand')
    },
    onError: stale,
  })

  async function send() {
    if (!canSend.value || sending.value) return
    const confirmed = await confirmAction({
      title: 'Send to the brand?',
      description:
        'The approved versions go to the brand. Creators can’t upload new ones after that.',
      confirmLabel: 'Send to brand',
    })
    if (confirmed) sendNow()
  }

  const status = computed(() => {
    if (!review.value) return null
    if (canSend.value) return { label: 'Ready to send', tone: 'success' as const }
    return deliverableStatuses[review.value.status]
  })
  const dueDate = computed(() => {
    const iso = review.value?.due_date
    return iso ? { label: formatDueDate(iso), hint: dueHint(iso, new Date()) } : null
  })
  // The newest upload across everyone: "Uploaded …" in the header.
  const lastUpload = computed(() => (review.value ? lastUploaded(review.value) : null))

  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && review.value === undefined)
  const notFound = computed(() => error.value?.status === 404)

  return {
    review,
    loading,
    error,
    notFound,
    status,
    dueDate,
    lastUpload,
    creators,
    creator,
    selectCreator,
    version,
    selectVersion,
    file,
    selectFile,
    openFile,
    sent,
    canDecide,
    picked,
    form,
    feedbackError,
    decide,
    pending,
    canSend,
    waiting,
    progress,
    sending,
    send,
  }
}
