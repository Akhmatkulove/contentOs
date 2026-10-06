import type { Deliverable } from '@/entities/deliverable'
import type { Schemas } from '@/shared/api'
import type { TeamMember } from '../api/team'

// A deliverable added in the form, kept in memory until the product is saved;
// then it goes with the product and its assignee starts seeing the product
// (docs/adr/0004).
export interface DeliverableDraft extends Deliverable {
  // The art director picked in the modal: always set on a new deliverable.
  assignee: TeamMember
}

// What the backend gets with the product.
export function toRequest(draft: DeliverableDraft): Schemas['DeliverableDraft'] {
  return {
    name: draft.name,
    assignee_id: draft.assignee.id,
    status: draft.status,
    due_date: draft.dueDate || null,
    brief: draft.brief || null,
  }
}
