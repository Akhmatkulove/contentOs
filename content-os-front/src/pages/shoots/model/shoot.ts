import { formatDueDate } from '@/entities/deliverable'
import { progressPercent } from '@/entities/shoot'
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
  // The art director first, then creators and mobilographers.
  team: TeamMember[]
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

// "1 product", "4 products".
export function productsLabel(count: number): string {
  return `${count} ${count === 1 ? 'product' : 'products'}`
}
