import { formatDueDate, type DeliverableStatus } from '@/entities/deliverable'
import { toReference, type ReferenceKind } from '@/entities/reference'
import type { Schemas } from '@/shared/api'
import type { SelectOption } from '@/shared/ui/select'
import type { TaskCounts, TaskItem, TaskSort } from '../api/tasks'

export type TaskRole = 'art_director' | 'creator'

export interface TaskReference {
  id: string
  title: string
  kind: ReferenceKind
  previewUrl: string | null
}

export interface DueHint {
  // "Today", "Tomorrow", "In 4 days", "2 days overdue".
  label: string
  // Today or overdue: Figma paints it red.
  urgent: boolean
}

// A row of My tasks: a shoot deliverable with its product, shoot and references.
export interface Task {
  id: string
  name: string
  status: DeliverableStatus
  // "Sep 18, 2024"; empty without a due date.
  dueDate: string
  due: DueHint | null
  shoot: { id: string; name: string; date: string }
  product: { name: string; sku: string; photoUrl: string | null }
  assignees: Schemas['TeamMember'][]
  // The first references; `moreReferences` is how many are left out.
  references: TaskReference[]
  moreReferences: number
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

export function toTask(item: TaskItem, today: Date): Task {
  const due = item.due_date ?? ''
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    dueDate: formatDueDate(due),
    due: due ? dueHint(due, today) : null,
    shoot: { id: item.shoot.id, name: item.shoot.name, date: formatDueDate(item.shoot.date) },
    product: {
      name: item.product.name,
      sku: item.product.sku ?? '',
      photoUrl: item.product.photo?.url ?? null,
    },
    assignees: item.assignees,
    references: item.references.map((reference) => {
      const card = toReference(reference)
      return { id: card.id, title: card.title, kind: card.kind, previewUrl: card.previewUrl }
    }),
    moreReferences: Math.max(0, item.references_total - item.references.length),
  }
}

// Review waits on the art director: an upload to check, or changes asked for.
// Everything else, and every creator's task, is View.
export function taskAction(role: TaskRole, status: DeliverableStatus): 'review' | 'view' {
  return role === 'art_director' && (status === 'needs_review' || status === 'needs_changes')
    ? 'review'
    : 'view'
}

export type TaskTabValue = 'all' | 'needs_review' | 'needs_changes' | 'to_shoot' | 'approved'

export interface TaskTab {
  value: TaskTabValue
  label: string
  count: number
}

const tabLabels: Record<TaskTabValue, string> = {
  all: 'All',
  needs_review: 'Needs review',
  needs_changes: 'Needs changes',
  to_shoot: 'To shoot',
  approved: 'Approved',
}

// Figma "Tabs / Status": the art director checks uploads, a creator shoots.
export const roleTabs: Record<TaskRole, readonly TaskTabValue[]> = {
  art_director: ['all', 'needs_review', 'needs_changes', 'to_shoot', 'approved'],
  creator: ['all', 'to_shoot', 'needs_changes', 'approved'],
}

// Counts follow the search and filters, not the tab.
export function taskTabs(role: TaskRole, counts: TaskCounts | undefined): TaskTab[] {
  return roleTabs[role].map((value) => ({
    value,
    label: tabLabels[value],
    count: counts?.[value] ?? 0,
  }))
}

export const taskSortOptions = [
  { value: 'priority', label: 'Priority' },
  { value: 'due_date', label: 'Due date' },
  { value: 'name_asc', label: 'Name: A–Z' },
] as const satisfies readonly (SelectOption & { value: TaskSort })[]

// Figma "Sort by: Priority" for the art director, "Sort by: Due date" for a creator.
export const defaultSort: Record<TaskRole, TaskSort> = {
  art_director: 'priority',
  creator: 'due_date',
}

// "Showing 8 of 14 tasks".
export function showingLabel(shown: number, total: number): string {
  return `Showing ${shown} of ${total} ${total === 1 ? 'task' : 'tasks'}`
}
