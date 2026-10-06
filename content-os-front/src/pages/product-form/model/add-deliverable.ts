import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'

// The modal's code loads on first open.
const AddDeliverableModal = defineAsyncComponent(() => import('../ui/AddDeliverableModal.vue'))

// What the new deliverable takes from the page it is opened on.
export interface DeliverableContext {
  // Product name, shown in a disabled field.
  product: string
}

// Opens "Add deliverable" and resolves with the draft, or undefined when cancelled.
// Move the modal to features/ once a second screen opens it.
export function openAddDeliverable(context: DeliverableContext) {
  return openModal(AddDeliverableModal, { context })
}
