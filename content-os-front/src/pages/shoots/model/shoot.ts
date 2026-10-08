import { formatDueDate } from '@/entities/deliverable'
import type { Schemas } from '@/shared/api'
import type { ShootListItem, ShootStatus } from '../api/shoots'

export type TeamMember = Schemas['TeamMember']

// What a shoot card shows.
export interface Shoot {
  id: string
  name: string
  // "Sep 18, 2024".
  date: string
  location: string
  status: ShootStatus
  photoUrl: string | null
  products: number
  deliverables: number
  approved: number
  // Approved out of all deliverables, 0–100.
  percent: number
  // The art director first, then creators and the mobilographer.
  team: TeamMember[]
}

// Share of approved deliverables, 0–100. No deliverables counts as 0%.
export function progressPercent(approved: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((Math.min(approved, total) / total) * 100)
}

export function toShoot(item: ShootListItem): Shoot {
  return {
    id: item.id,
    name: item.name,
    date: formatDueDate(item.date),
    location: item.location ?? '',
    status: item.status,
    photoUrl: item.photo?.url ?? null,
    products: item.products,
    deliverables: item.deliverables,
    approved: item.approved,
    percent: progressPercent(item.approved, item.deliverables),
    team: item.team,
  }
}

// How each status looks in VStatus (Figma "CMS / Products / Status").
export const shootStatuses = {
  upcoming: { label: 'Upcoming', tone: 'accent' },
  to_shoot: { label: 'To shoot', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
} as const satisfies Record<ShootStatus, { label: string; tone: string }>

// "1 product", "4 products".
export function productsLabel(count: number): string {
  return `${count} ${count === 1 ? 'product' : 'products'}`
}
