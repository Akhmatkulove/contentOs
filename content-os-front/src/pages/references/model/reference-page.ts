import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { referenceKeys } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import { confirmAction } from '@/shared/ui/confirm-modal'
import { openMediaViewer } from '@/shared/ui/media-viewer'
import { toast } from '@/shared/ui/toast'
import {
  deleteReference,
  fetchReference,
  setFavorite,
  type ReferenceDetails,
} from '../api/references'
import { linkIcon, referenceFacts, referenceTitle } from './reference'

// The in-app page the user came from: the references list with its tab,
// filters and page, a shoot, a product. None after a direct link or a new tab.
function previousPage(): string | null {
  const back: unknown = window.history.state?.back
  return typeof back === 'string' ? back : null
}
// Where "Back" leads: that page, or the references list.
function backRoute(): RouteLocationRaw {
  return previousPage() ?? { name: 'references' }
}
function backLabel(): string {
  const back = previousPage()
  if (back === null || /^\/references(\?|$)/.test(back)) return 'Back to references'
  if (back.startsWith('/shoots/')) return 'Back to shoot'
  if (back.startsWith('/products/')) return 'Back to product'
  return 'Back'
}

// The reference page: its files in their own proportions, the details, the
// star and, for the author, delete. A file opens the fullscreen viewer.
export function useReferencePage(id: () => string) {
  const router = useRouter()
  const queryCache = useQueryCache()
  const session = useSessionStore()

  const {
    data: reference,
    error,
    isLoading,
  } = useQuery({
    key: () => referenceKeys.detail(id()),
    query: () => fetchReference(id()),
    meta: { toast: false },
  })

  const title = computed(() => (reference.value ? referenceTitle(reference.value) : ''))
  const facts = computed(() => (reference.value ? referenceFacts(reference.value) : []))
  const files = computed(() => reference.value?.files ?? [])
  const link = computed(() => {
    const url = reference.value?.link
    return url ? { url, icon: linkIcon(url) } : null
  })
  // Only the author may delete a reference (the backend checks it too).
  const canRemove = computed(
    () => !!reference.value && reference.value.author_id === session.me?.id,
  )

  // The star flips at once and goes back if saving fails (the global handler
  // shows the error toast).
  const { mutate: saveFavorite, isLoading: savingFavorite } = useMutation({
    mutation: ({ reference, favorite }: { reference: ReferenceDetails; favorite: boolean }) =>
      setFavorite(reference.id, favorite),
    onMutate: ({ reference, favorite }) => {
      queryCache.setQueryData(referenceKeys.detail(reference.id), { ...reference, favorite })
    },
    onError: (_error, { reference }) => {
      queryCache.setQueryData(referenceKeys.detail(reference.id), reference)
    },
    onSuccess: async (_data, { favorite }) => {
      toast.success(favorite ? 'Added to favorites' : 'Removed from favorites')
      await queryCache.invalidateQueries({ key: referenceKeys.lists })
    },
  })
  // One save at a time: a quick double click would race a PUT against a DELETE.
  function toggleFavorite() {
    if (reference.value && !savingFavorite.value)
      saveFavorite({ reference: reference.value, favorite: !reference.value.favorite })
  }

  const { mutate: remove, isLoading: removing } = useMutation({
    mutation: (reference: ReferenceDetails) => deleteReference(reference.id),
    onSuccess: async (_data, reference) => {
      toast.success('Reference deleted')
      // Back to the page it came from, so history has no second copy of it.
      if (previousPage()) router.back()
      else await router.replace(backRoute())
      // Dropped rather than refreshed: it would refetch into a 404.
      const entry = queryCache.get(referenceKeys.detail(reference.id))
      if (entry) queryCache.remove(entry)
      // The filters too: the reference may have been the last with its tag or product.
      await queryCache.invalidateQueries({ key: referenceKeys.all })
    },
  })
  async function removeReference() {
    const current = reference.value
    if (!current) return
    const confirmed = await confirmAction({
      title: 'Delete reference?',
      description: `“${title.value}” will be deleted for everyone and removed from shoots that use it. This can’t be undone.`,
      confirmLabel: 'Delete',
    })
    if (confirmed) remove(current)
  }

  function openFile(index: number) {
    openMediaViewer({ files: files.value, start: index, title: title.value })
  }

  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && reference.value === undefined)
  const notFound = computed(() => error.value?.status === 404)

  return {
    reference,
    loading,
    error,
    notFound,
    title,
    facts,
    files,
    link,
    canRemove,
    removing,
    toggleFavorite,
    removeReference,
    openFile,
    back: backRoute(),
    backLabel: backLabel(),
  }
}
