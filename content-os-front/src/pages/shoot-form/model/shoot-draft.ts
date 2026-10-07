import type { Schemas } from '@/shared/api'
import type { IconName } from '@/shared/ui/icon'

// What the create-shoot screen shows. Shaped for the screen, not the API:
// TODO(api): map from the shoots API once it lands.

export type TeamMember = Schemas['TeamMember']

export interface ShootProduct {
  id: string
  name: string
  collection: string
  photoUrl: string | null
}

export type ReferenceSource = 'instagram' | 'tiktok' | 'upload'

export interface ShootReference {
  id: string
  title: string
  source: ReferenceSource
  previewUrl: string | null
  // Videos only; null for images.
  durationSec: number | null
  // The product the reference is for.
  productName: string
}

export type ShootDeliverableStatus = 'planned'

export interface ShootDeliverable {
  id: string
  name: string
  product: { name: string; photoUrl: string | null }
  reference: { title: string; previewUrl: string | null }
  assignee: TeamMember | null
  // ISO date, YYYY-MM-DD; empty when not set.
  dueDate: string
  status: ShootDeliverableStatus
}

// Figma "Metadata / Instagram" and the like under a reference.
export const referenceSources = {
  instagram: { label: 'Instagram', icon: 'instagram' },
  tiktok: { label: 'TikTok', icon: 'tiktok' },
  upload: { label: 'Upload', icon: 'upload-01' },
} as const satisfies Record<ReferenceSource, { label: string; icon: IconName }>

// How each status looks in VStatus.
export const shootDeliverableStatuses = {
  planned: { label: 'Planned', tone: 'info' },
} as const satisfies Record<ShootDeliverableStatus, { label: string; tone: string }>

// "4 selected / 4 products" next to the product search.
export function selectionLabel(selected: number, total: number): string {
  return `${selected} selected / ${total} ${total === 1 ? 'product' : 'products'}`
}

// The select-all box: ticked when every row is picked, a bar when only some are.
export function selectAllState(selected: number, total: number): boolean | 'indeterminate' {
  if (total === 0 || selected === 0) return false
  return selected === total ? true : 'indeterminate'
}

// The picked ids after a checkbox changes: added once when ticked, dropped when not.
export function toggleSelection(ids: string[], id: string, picked: boolean): string[] {
  const rest = ids.filter((value) => value !== id)
  return picked ? [...rest, id] : rest
}
