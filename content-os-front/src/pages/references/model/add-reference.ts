import { useQuery, useQueryCache } from '@pinia/colada'
import { computed, ref } from 'vue'
import { productKeys } from '@/entities/product'
import { referenceKeys } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import { openAddReference, saveReference, type ReferenceDraft } from '@/features/add-reference'
import { toast } from '@/shared/ui/toast'
import { fetchProductOptions } from '../api/references'

// "Add reference" on the pool: saves at once, the author is the user.
export function useAddReference() {
  const session = useSessionStore()
  const queryCache = useQueryCache()

  // Products load on the first open, alongside the modal's code.
  const requested = ref(false)
  const { data } = useQuery({
    key: productKeys.options,
    query: fetchProductOptions,
    enabled: requested,
  })
  const products = computed(() =>
    (data.value ?? []).map((product) => ({ value: product.id, label: product.name })),
  )

  async function save(draft: ReferenceDraft) {
    await saveReference(draft)
    // The list, its tab counts and the filter options all may change.
    await queryCache.invalidateQueries({ key: referenceKeys.all })
  }

  async function addReference() {
    requested.value = true
    const added = await openAddReference({ creator: session.me?.name ?? '', products, save })
    if (added) toast.success('Reference added')
  }

  return { addReference }
}
