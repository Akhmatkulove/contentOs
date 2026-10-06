import type { SelectOption } from '@/shared/ui/select'
import type { TeamMember } from '../api/team'

// Figma workflow statuses of a deliverable.
export const deliverableStatusOptions = [
  { value: 'to_shoot', label: 'To shoot' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'needs_changes', label: 'Needs changes' },
  { value: 'approved', label: 'Approved' },
] as const satisfies readonly SelectOption[]

export type DeliverableStatus = (typeof deliverableStatusOptions)[number]['value']

// How each status looks in VStatus.
export const deliverableStatuses = {
  to_shoot: { label: 'To shoot', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'info' },
  needs_changes: { label: 'Needs changes', tone: 'danger' },
  approved: { label: 'Approved', tone: 'success' },
} as const satisfies Record<DeliverableStatus, { label: string; tone: string }>

// A deliverable added on the product page, kept in memory until the product is created.
// TODO(api): deliverables — no backend yet, the drafts aren't sent with the product.
export interface DeliverableDraft {
  id: string
  name: string
  // The art director; the row shows their name and photo.
  assignee: TeamMember | null
  status: DeliverableStatus
  // ISO date, YYYY-MM-DD; empty when not set.
  dueDate: string
  brief: string
}

// "2024-09-18" → "Sep 18, 2024"; read as a local date, not UTC midnight.
export function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
