import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'
import type { DeliverableReference, ShootProduct, TeamMember } from './shoot-draft'

// The modal's code loads on first open.
const AddDeliverableModal = defineAsyncComponent(() => import('../ui/AddDeliverableModal.vue'))

// What a new deliverable is picked from: what the shoot has at the moment.
export interface DeliverableContext {
  // The ticked products.
  products: ShootProduct[]
  // The shoot's team: creators and mobilographers.
  team: TeamMember[]
  // The ticked references, new ones included.
  references: DeliverableReference[]
}

// Opens "Add deliverable" and resolves with the deliverable, or undefined when cancelled.
export function openAddDeliverable(context: DeliverableContext) {
  return openModal(AddDeliverableModal, { context })
}
