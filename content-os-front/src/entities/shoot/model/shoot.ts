import type { Schemas } from '@/shared/api'

type ShootStatus = Schemas['ShootStatus']

// How each status looks in VStatus (Figma "CMS / Products / Status").
export const shootStatuses = {
  upcoming: { label: 'Upcoming', tone: 'accent' },
  to_shoot: { label: 'To shoot', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'info' },
  needs_review: { label: 'Needs review', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
} as const satisfies Record<ShootStatus, { label: string; tone: string }>

// A length in minutes: 30 → "30 min", 60 → "1 h", 90 → "1 h 30 min".
export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

// Share of approved deliverables, 0–100. No deliverables counts as 0%.
export function progressPercent(approved: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((Math.min(approved, total) / total) * 100)
}
