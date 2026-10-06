import type { SelectOption } from '@/shared/ui/select'

// Figma workflow statuses of a deliverable.
export const deliverableStatusOptions = [
  { value: 'to_shoot', label: 'To shoot' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'needs_changes', label: 'Needs changes' },
  { value: 'approved', label: 'Approved' },
] as const satisfies readonly SelectOption[]

export type DeliverableStatus = (typeof deliverableStatusOptions)[number]['value']

// A deliverable added on the product page, kept in memory until the product is created.
// TODO(api): deliverables — no backend yet, the drafts aren't sent with the product.
export interface DeliverableDraft {
  id: string
  name: string
  // Art director's user id.
  assigneeId: string | undefined
  status: DeliverableStatus
  // ISO date, YYYY-MM-DD; empty when not set.
  dueDate: string
  brief: string
}
