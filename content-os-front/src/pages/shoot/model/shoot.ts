import { formatDueDate } from '@/entities/deliverable'
import { durationLabel, type ShootDetails } from '@/entities/shoot'
import type { Schemas } from '@/shared/api'
import type { ShootProduct } from './products-tab'
import type { ShootTask } from './tasks-tab'

// What the whole shoot page shares: the people, the header and the Overview tab.
// Each tab's own rules and state are in its *-tab.ts.

export type TeamMember = Schemas['TeamMember']
export type DeliverableCounts = Schemas['DeliverableCounts']

export type ShootRoleLabel = 'Art Director' | 'Creator' | 'Mobilographer'

export interface ShootPerson {
  member: TeamMember
  role: ShootRoleLabel
}

// The art director first, then creators and the mobilographer.
export function shootPeople(shoot: ShootDetails): ShootPerson[] {
  return [
    { member: shoot.art_director, role: 'Art Director' },
    ...shoot.creators.map((member) => ({ member, role: 'Creator' as const })),
    ...(shoot.mobilographer
      ? [{ member: shoot.mobilographer, role: 'Mobilographer' as const }]
      : []),
  ]
}

// Deliverables of the whole shoot by status.
export function shootCounts(tasks: ShootTask[]): DeliverableCounts {
  const counts: DeliverableCounts = {
    total: tasks.length,
    to_shoot: 0,
    in_progress: 0,
    needs_review: 0,
    needs_changes: 0,
    approved: 0,
  }
  for (const task of tasks) counts[task.status] += 1
  return counts
}

// "Shoot details": Date, Start time, Location, Est. duration.
export function shootFacts(shoot: ShootDetails) {
  return {
    date: formatDueDate(shoot.date),
    // "10:00:00" → "10:00".
    startTime: shoot.start_time.slice(0, 5),
    location: shoot.location ?? '',
    duration: durationLabel(shoot.duration_minutes),
  }
}

// Figma "Card / Shoot covers": up to `shown` product photos, then "+N".
export function coverPhotos(products: ShootProduct[], shown: number) {
  const photos = products.flatMap((product) =>
    product.photoUrl ? [{ id: product.id, name: product.name, url: product.photoUrl }] : [],
  )
  return { photos: photos.slice(0, shown), more: Math.max(0, photos.length - shown) }
}

// Case-insensitive search of the tabs, run in the browser.
export const matches = (text: string, search: string) =>
  text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())

// Reka Select can't hold an empty value, so "All …" is this sentinel.
export const ALL = 'all'
