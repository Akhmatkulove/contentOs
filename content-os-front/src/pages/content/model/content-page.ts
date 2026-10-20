import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { contentKeys } from '@/entities/content'
import { confirmAction } from '@/shared/ui/confirm-modal'
import { openMediaViewer } from '@/shared/ui/media-viewer'
import { toast } from '@/shared/ui/toast'
import {
  addComment,
  approveContent,
  deleteComment,
  fetchContentDetails,
  setContentFavorite,
  type ContentComment,
  type ContentDetails,
  type ContentReference,
} from '../api/content'
import { commentFeed, rail, startIndex, toMediaFiles } from './content-details'

// The in-app page the user came from; none after a direct link or a new tab.
function previousPage(): string | null {
  const back: unknown = window.history.state?.back
  return typeof back === 'string' ? back : null
}
// "Back to content" returns to the list with its tab, filters and page.
function backRoute(): RouteLocationRaw {
  const back = previousPage()
  return back?.startsWith('/content') ? back : { name: 'content' }
}

// The content page (docs/adr/0026): a sent deliverable with all its files.
// The stage shows one file cropped to fill; it, and "+N", open the viewer with
// every file in its own proportions. The brand stars and approves; the brand
// and the shoot's art director comment.
export function useContentPage(id: () => string) {
  const route = useRoute()
  const queryCache = useQueryCache()

  const {
    data: content,
    error,
    isLoading,
  } = useQuery({
    key: () => contentKeys.detail(id()),
    query: () => fetchContentDetails(id()),
    meta: { toast: false },
  })

  const materials = computed(() => content.value?.materials ?? [])
  // The file on the stage. Opens on the one tapped in the list (?file=), and
  // resets when Previous / Next leads to another deliverable.
  const selected = ref(0)
  watch(
    () => content.value?.id,
    (loaded) => {
      if (loaded) selected.value = startIndex(materials.value, route.query.file)
    },
    { immediate: true },
  )
  const current = computed(() => materials.value[selected.value] ?? materials.value[0] ?? null)
  const thumbnails = computed(() => rail(materials.value))

  function openViewer(start = selected.value) {
    if (!content.value) return
    openMediaViewer({ files: toMediaFiles(materials.value), start, title: content.value.name })
  }

  // The brand has no reference page: the reference's files open in the viewer.
  function openReference(reference: ContentReference) {
    openMediaViewer({
      files: reference.files,
      start: 0,
      title: reference.title || 'Reference',
    })
  }

  // The star flips at once and goes back if saving fails (the global handler
  // shows the error toast).
  const { mutate: saveFavorite, isLoading: savingFavorite } = useMutation({
    mutation: ({ content, favorite }: { content: ContentDetails; favorite: boolean }) =>
      setContentFavorite(content.id, favorite),
    onMutate: ({ content, favorite }) => {
      queryCache.setQueryData(contentKeys.detail(content.id), { ...content, favorite })
    },
    onError: (_error, { content }) => {
      queryCache.setQueryData(contentKeys.detail(content.id), content)
    },
    onSuccess: async (_data, { favorite }) => {
      toast.success(favorite ? 'Added to favorites' : 'Removed from favorites')
      // The Favorites tab and its count.
      await queryCache.invalidateQueries({ key: contentKeys.lists })
    },
  })
  // One save at a time: a quick double click would race a PUT against a DELETE.
  function toggleFavorite() {
    if (content.value && !savingFavorite.value)
      saveFavorite({ content: content.value, favorite: !content.value.favorite })
  }

  // The draft stays if sending fails, so nothing typed is lost.
  const draft = shallowRef('')
  const { mutateAsync: sendComment, isLoading: sending } = useMutation({
    mutation: ({ id, body }: { id: string; body: string }) => addComment(id, body),
    onSuccess: (comment, { id }) => {
      const cached = queryCache.getQueryData<ContentDetails>(contentKeys.detail(id))
      if (cached)
        queryCache.setQueryData(contentKeys.detail(id), {
          ...cached,
          comments: [comment, ...cached.comments],
        })
    },
  })
  const canSend = computed(() => draft.value.trim() !== '' && !sending.value)
  async function submitComment(): Promise<boolean> {
    if (!content.value || !canSend.value) return false
    try {
      await sendComment({ id: content.value.id, body: draft.value.trim() })
    } catch {
      return false
    }
    draft.value = ''
    return true
  }

  // The comment leaves the feed at once and comes back if deleting fails (the
  // global handler shows the error toast).
  const { mutate: dropComment } = useMutation({
    mutation: ({ id, comment }: { id: string; comment: ContentComment }) =>
      deleteComment(id, comment.id),
    onMutate: ({ id, comment }) => {
      const cached = queryCache.getQueryData<ContentDetails>(contentKeys.detail(id))
      if (cached)
        queryCache.setQueryData(contentKeys.detail(id), {
          ...cached,
          comments: cached.comments.filter((item) => item.id !== comment.id),
        })
    },
    onError: async (_error, { id }) => {
      await queryCache.invalidateQueries({ key: contentKeys.detail(id) })
    },
    onSuccess: () => toast.success('Comment deleted'),
  })
  async function removeComment(comment: ContentComment) {
    const current = content.value
    if (!current) return
    const confirmed = await confirmAction({
      title: 'Delete comment?',
      description: 'The comment will be deleted for everyone. This can’t be undone.',
      confirmLabel: 'Delete',
    })
    if (confirmed) dropComment({ id: current.id, comment })
  }

  const { mutate: approve, isLoading: approving } = useMutation({
    mutation: (id: string) => approveContent(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryCache.invalidateQueries({ key: contentKeys.detail(id) }),
        // The cards' status chips and the Status filter.
        queryCache.invalidateQueries({ key: contentKeys.lists }),
      ])
    },
  })
  function approveContentNow() {
    if (content.value?.can_approve && !approving.value) approve(content.value.id)
  }

  const feed = computed(() =>
    content.value ? commentFeed(content.value.comments, content.value.approved_at) : [],
  )

  // Previous / Next keep ?file= out: the next deliverable opens on its first file.
  // They replace the entry, so Back still leads to the list in one step.
  function neighbour(neighbourId: string | null | undefined): RouteLocationRaw | null {
    return neighbourId ? { name: 'content-item', params: { id: neighbourId } } : null
  }

  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && content.value === undefined)
  const notFound = computed(() => error.value?.status === 404)

  return {
    content,
    loading,
    error,
    notFound,
    selected,
    current,
    thumbnails,
    openViewer,
    openReference,
    toggleFavorite,
    draft,
    canSend,
    sending,
    submitComment,
    removeComment,
    approve: approveContentNow,
    approving,
    feed,
    previous: computed(() => neighbour(content.value?.previous_id)),
    next: computed(() => neighbour(content.value?.next_id)),
    back: backRoute(),
  }
}
