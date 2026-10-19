import { useQueryCache } from '@pinia/colada'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { collectionKeys } from '@/entities/collection'
import { referenceKeys, toReference, type Reference } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import { openAddReference, saveReference, type ReferenceDraft } from '@/features/add-reference'
import type { SelectOption } from '@/shared/ui/select'
import { toast } from '@/shared/ui/toast'
import { openReferenceBank } from './browse-references'
import type { ShootProduct } from './shoot-draft'

// The shoot's products as the Product options of "Add reference".
export function referenceProductOptions(products: ShootProduct[]): SelectOption[] {
  return products.map((product) => ({ value: product.id, label: product.name }))
}

// "References for this shoot": references picked in the bank and new ones
// added here. A new reference goes to the pool as soon as it is added, where
// the art director's creators see it too (docs/adr/0006). The ticked ones go
// into the shoot.
// `initial`: the shoot's saved references when editing; all of them ticked.
export function useShootReferences(
  products: MaybeRefOrGetter<ShootProduct[]>,
  initial: Reference[] = [],
) {
  const session = useSessionStore()
  const queryCache = useQueryCache()

  const references = ref<Reference[]>(initial)
  const selected = ref<string[]>(initial.map((reference) => reference.id))

  async function save(draft: ReferenceDraft): Promise<Reference> {
    const reference = toReference(await saveReference(draft))
    // The pool, its tab counts and filter options show the new reference; its
    // collection may be new.
    await Promise.all([
      queryCache.invalidateQueries({ key: referenceKeys.all }),
      queryCache.invalidateQueries({ key: collectionKeys.all }),
    ])
    return reference
  }

  // Saved in the modal, which stays open if that fails; the new reference
  // joins the shoot ticked, first as in the product form. Joins on save, not on
  // close: the modal may be dismissed while the save is still running.
  async function addReference() {
    await openAddReference({
      creator: session.me?.name ?? '',
      products: () => referenceProductOptions(toValue(products)),
      save: async (draft) => {
        const added = await save(draft)
        references.value = [added, ...references.value]
        selected.value = [...selected.value, added.id]
        toast.success('Reference added')
      },
    })
  }

  // The bank starts from the ticked references; its pick replaces them, all ticked.
  async function browse() {
    const ticked = references.value.filter((reference) => selected.value.includes(reference.id))
    const picked = await openReferenceBank(ticked)
    if (!picked) return
    references.value = picked
    selected.value = picked.map((reference) => reference.id)
  }

  return { references, selected, addReference, browse }
}
