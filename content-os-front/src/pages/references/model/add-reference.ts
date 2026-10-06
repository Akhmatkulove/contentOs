import { useQuery, useQueryCache } from '@pinia/colada'
import { computed, ref } from 'vue'
import { useSessionStore } from '@/entities/session'
import { openAddReference, toRequest, type ReferenceDraft } from '@/features/add-reference'
import { uploadFile } from '@/shared/api'
import { uploadAll } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'
import { createReference, fetchProductOptions, type ReferenceCreate } from '../api/references'

// The draft as the pool's request, once its files are uploaded.
export function toCreateRequest(draft: ReferenceDraft, fileIds: string[]): ReferenceCreate {
  return {
    ...toRequest(draft, fileIds),
    product_id: draft.productId ?? null,
    collection: draft.collection || null,
    favorite: draft.favorite,
  }
}

// "Add reference" on the pool: saves at once, the author is the user.
export function useAddReference() {
  const session = useSessionStore()
  const queryCache = useQueryCache()

  // Products load on the first open, alongside the modal's code.
  const requested = ref(false)
  const { data } = useQuery({
    key: ['products', 'options'],
    query: fetchProductOptions,
    enabled: requested,
  })
  const products = computed(() =>
    (data.value ?? []).map((product) => ({ value: product.id, label: product.name })),
  )

  async function save(draft: ReferenceDraft) {
    const uploaded = await uploadAll(draft.files, uploadFile)
    await createReference(
      toCreateRequest(
        draft,
        uploaded.map((file) => file.id),
      ),
    )
    // The list, its tab counts and the filter options all may change.
    await queryCache.invalidateQueries({ key: ['references'] })
  }

  async function addReference() {
    requested.value = true
    const added = await openAddReference({ creator: session.me?.name ?? '', products, save })
    if (added) toast.success('Reference added')
  }

  return { addReference }
}
