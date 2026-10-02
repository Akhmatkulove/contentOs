import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'

// The modal's code loads on first open.
const AddReferenceModal = defineAsyncComponent(() => import('../ui/AddReferenceModal.vue'))

// Opens "Add reference". Move the modal to features/ once a second screen opens it.
export function openAddReference() {
  return openModal(AddReferenceModal)
}
