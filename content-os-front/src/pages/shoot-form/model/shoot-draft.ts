import type { DeliverableStatus } from '@/entities/deliverable'
import type { Schemas } from '@/shared/api'

// What the shoot form shows. Shaped for the screen, not the API:
// shoot-initial.ts maps a saved shoot in, shoot-request.ts maps the form out.

export type TeamMember = Schemas['TeamMember']

export interface ShootProduct {
  id: string
  name: string
  collection: string
  photoUrl: string | null
}

// A shoot reference as a deliverable shows it: a snapshot taken when the
// deliverable was added.
export interface DeliverableReference {
  id: string
  title: string
  previewUrl: string | null
}

export interface ShootDeliverable {
  id: string
  // Already on the server (editing a shoot): keeps its id when the shoot is saved.
  saved?: boolean
  name: string
  product: ShootProduct
  // The shoot's references to follow; may be none.
  references: DeliverableReference[]
  // People of the shoot's team; may be none.
  assignees: TeamMember[]
  // ISO date, YYYY-MM-DD; empty when not set.
  dueDate: string
  status: DeliverableStatus
}

// "Amina", "Amina +2": the first name in a list and how many more there are.
export function firstAndMore(names: string[]): string {
  const [first, ...rest] = names
  if (first === undefined) return ''
  return rest.length ? `${first} +${rest.length}` : first
}

// "4 selected / 4 products" next to the product search.
export function selectionLabel(selected: number, total: number): string {
  return `${selected} selected / ${total} ${total === 1 ? 'product' : 'products'}`
}

// The picked ids after a checkbox changes: added once when ticked, dropped when not.
export function toggleSelection(ids: string[], id: string, picked: boolean): string[] {
  const rest = ids.filter((value) => value !== id)
  return picked ? [...rest, id] : rest
}
