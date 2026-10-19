import type { Schemas } from '@/shared/api'
import type { SelectOption } from '@/shared/ui/select'

export type DeliverableStatus = Schemas['DeliverableStatus']
export type DeliverableType = Schemas['DeliverableType']
// The assigned art director: name and photo for the avatar.
export type Assignee = Schemas['TeamMember']

// What the deliverable rows show: a saved deliverable or one still in a form.
export interface Deliverable {
  id: string
  name: string
  type: DeliverableType
  // Null once the assignee is unassigned (the brand–art director link was removed).
  assignee: Assignee | null
  // Comes from the shoot deliverables that close it (docs/adr/0018).
  status: DeliverableStatus
  // How many shoots close it; 0 — not scheduled yet.
  shoots: number
  // ISO date, YYYY-MM-DD; empty when not set.
  dueDate: string
  brief: string
}

export function toDeliverable(item: Schemas['DeliverableResponse']): Deliverable {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    assignee: item.assignee,
    status: item.status,
    shoots: item.shoots,
    dueDate: item.due_date ?? '',
    brief: item.brief ?? '',
  }
}

// What the deliverable is shot as.
export const deliverableTypeOptions = [
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
] as const satisfies readonly (SelectOption & { value: DeliverableType })[]

export const deliverableTypes = {
  video: 'Video',
  image: 'Image',
} as const satisfies Record<DeliverableType, string>

// Figma workflow statuses, in the order of the progress summary.
export const deliverableStatusOptions = [
  { value: 'to_shoot', label: 'To shoot' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'needs_changes', label: 'Needs changes' },
  { value: 'approved', label: 'Approved' },
] as const satisfies readonly (SelectOption & { value: DeliverableStatus })[]

// How each status looks in VStatus.
export const deliverableStatuses = {
  to_shoot: { label: 'To shoot', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'info' },
  // Uploaded and waiting for the art director (docs/adr/0009).
  needs_review: { label: 'Needs review', tone: 'warning' },
  needs_changes: { label: 'Needs changes', tone: 'danger' },
  approved: { label: 'Approved', tone: 'success' },
} as const satisfies Record<DeliverableStatus, { label: string; tone: string }>

// A brand's deliverable as a VStatus: its status, but "Not scheduled" while no
// shoot closes it yet (docs/adr/0018).
export function deliverableStatusChip(deliverable: Pick<Deliverable, 'status' | 'shoots'>): {
  label: string
  tone: (typeof deliverableStatuses)[DeliverableStatus]['tone']
} {
  if (deliverable.status === 'to_shoot' && deliverable.shoots === 0) {
    return { label: 'Not scheduled', tone: 'info' }
  }
  return deliverableStatuses[deliverable.status]
}

// A shoot is already working on it (or has sent its content): the brand can't
// remove it (docs/adr/0021). Planned but not started is still removable.
export function deliverableInWork(deliverable: Pick<Deliverable, 'status'>): boolean {
  return deliverable.status !== 'to_shoot'
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

// "1 deliverable", "6 deliverables".
export function deliverablesLabel(count: number): string {
  return `${count} ${count === 1 ? 'deliverable' : 'deliverables'}`
}

export interface DueHint {
  // "Today", "Tomorrow", "In 4 days", "2 days overdue".
  label: string
  // Today or overdue: Figma paints it red.
  urgent: boolean
}

const DAY = 24 * 60 * 60 * 1000

// Whole days from `today` to the ISO date, both read as local dates.
function daysUntil(iso: string, today: Date): number | null {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return null
  const due = Date.UTC(year, month - 1, day)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - now) / DAY)
}

// The line under the due date (Figma "Today", "Tomorrow", "In 4 days").
export function dueHint(iso: string, today: Date): DueHint | null {
  const days = daysUntil(iso, today)
  if (days === null) return null
  if (days === 0) return { label: 'Today', urgent: true }
  if (days === 1) return { label: 'Tomorrow', urgent: false }
  if (days > 1) return { label: `In ${days} days`, urgent: false }
  const late = -days
  return { label: `${late} ${late === 1 ? 'day' : 'days'} overdue`, urgent: true }
}
