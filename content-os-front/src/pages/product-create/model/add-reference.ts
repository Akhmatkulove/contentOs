import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'

// The modal's code loads on first open.
const AddReferenceModal = defineAsyncComponent(() => import('../ui/AddReferenceModal.vue'))

// What the new reference takes from the product; shown in disabled fields.
export interface ReferenceContext {
  product: string
  collection: string
  creator: string
}

// Opens "Add reference" and resolves with the draft, or undefined when cancelled.
// Move the modal to features/ once a second screen opens it.
export function openAddReference(context: ReferenceContext) {
  return openModal(AddReferenceModal, { context })
}
