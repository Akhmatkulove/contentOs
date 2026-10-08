import { useQueryCache } from '@pinia/colada'
import { computed, onScopeDispose, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { toReference, type Reference } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import {
  draftCard,
  openAddReference,
  previewFile,
  saveReference,
  type ReferenceDraft,
} from '@/features/add-reference'
import type { SelectOption } from '@/shared/ui/select'
import { openReferenceBank } from './browse-references'
import type { ShootProduct } from './shoot-draft'

interface DraftEntry {
  draft: ReferenceDraft
  // Object URL of the draft's first image, owned by this page.
  previewUrl: string | null
}

// The shoot's products as the Product options of "Add reference".
export function referenceProductOptions(products: ShootProduct[]): SelectOption[] {
  return products.map((product) => ({ value: product.id, label: product.name }))
}

// "References for this shoot": references picked in the bank and new ones
// added here. A new reference stays a draft in memory until the shoot is
// created; then it goes to the pool, where the art director's creators see it
// too (docs/adr/0006). The ticked ones go into the shoot.
export function useShootReferences(products: MaybeRefOrGetter<ShootProduct[]>) {
  const session = useSessionStore()
  const queryCache = useQueryCache()

  // From the bank, plus drafts once they are saved.
  const saved = ref<Reference[]>([])
  const drafts = shallowRef<DraftEntry[]>([])
  const selected = ref<string[]>([])
  // Draft id → its id in the pool once saved: deliverables still hold the draft's.
  const savedIds = new Map<string, string>()
  const savedId = (id: string) => savedIds.get(id) ?? id

  // New ones first, as in the product form.
  const references = computed<Reference[]>(() => [
    ...drafts.value.map(({ draft, previewUrl }) =>
      draftCard(draft, session.me?.name ?? '', previewUrl),
    ),
    ...saved.value,
  ])

  function revoke(entry: DraftEntry) {
    if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)
  }

  // The new reference joins the shoot ticked.
  async function addReference() {
    const draft = await openAddReference({
      creator: session.me?.name ?? '',
      products: () => referenceProductOptions(toValue(products)),
    })
    if (!draft) return
    const preview = previewFile(draft)
    drafts.value = [
      ...drafts.value,
      { draft, previewUrl: preview ? URL.createObjectURL(preview) : null },
    ]
    selected.value = [...selected.value, draft.id]
  }

  // The bank starts from the ticked saved references; its pick replaces them,
  // all ticked. Drafts aren't in the pool yet, so they stay as they are.
  async function browse() {
    const ticked = saved.value.filter((reference) => selected.value.includes(reference.id))
    const picked = await openReferenceBank(ticked)
    if (!picked) return
    const draftIds = new Set(drafts.value.map(({ draft }) => draft.id))
    saved.value = picked
    selected.value = [
      ...selected.value.filter((id) => draftIds.has(id)),
      ...picked.map((reference) => reference.id),
    ]
  }

  // Saves the ticked drafts to the pool one by one. A saved draft becomes a
  // saved reference right away, so a retry after a failure doesn't repeat it.
  // Unticked drafts aren't in the shoot and are not saved.
  async function saveDrafts() {
    const ticked = drafts.value.filter(({ draft }) => selected.value.includes(draft.id))
    try {
      for (const entry of ticked) {
        const reference = toReference(await saveReference(entry.draft))
        savedIds.set(entry.draft.id, reference.id)
        revoke(entry)
        drafts.value = drafts.value.filter((item) => item !== entry)
        saved.value = [reference, ...saved.value]
        selected.value = selected.value.map((id) => (id === entry.draft.id ? reference.id : id))
      }
    } finally {
      // The pool, its tab counts and filter options may show the new references.
      if (ticked.length) await queryCache.invalidateQueries({ key: ['references'] })
    }
  }

  onScopeDispose(() => drafts.value.forEach(revoke))

  return { references, selected, addReference, browse, saveDrafts, savedId }
}
