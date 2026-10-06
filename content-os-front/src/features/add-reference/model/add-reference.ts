import { defineAsyncComponent, type MaybeRefOrGetter } from 'vue'
import type { SelectOption } from '@/shared/ui/select'
import { openModal } from '@/shared/ui/modal'
import type { ReferenceDraft } from './reference-draft'

// The modal's code loads on first open.
const AddReferenceModal = defineAsyncComponent(() => import('../ui/AddReferenceModal.vue'))

export interface AddReferenceOptions {
  // Author's name: the Creator field, always filled in and not editable.
  creator: string
  // Set by the screen (a product being created): shown in disabled fields.
  // Otherwise the product is picked from `products` and the collection typed.
  fixed?: { product: string; collection: string }
  // May still be loading when the modal opens: the list fills in when it arrives.
  products?: MaybeRefOrGetter<readonly SelectOption[]>
  // Saves the reference before the modal closes: the modal shows progress and
  // stays open if it fails. Without it the modal closes with the draft. Only a
  // saved reference can go to favorites, so the toggle shows only with `save`.
  save?: (draft: ReferenceDraft) => Promise<unknown>
}

// Opens "Add reference" and resolves with the draft, or undefined when cancelled.
export function openAddReference(options: AddReferenceOptions) {
  return openModal(AddReferenceModal, { options })
}
