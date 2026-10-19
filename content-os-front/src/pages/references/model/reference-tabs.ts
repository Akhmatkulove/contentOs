import type { ReferenceScope } from '@/entities/reference'
import type { ReferenceCounts } from '../api/references'

// The backend's scopes and the Collections tab: the same pool grouped by collection.
export type ReferenceTabValue = ReferenceScope | 'collections'

export interface ReferenceTab {
  value: ReferenceTabValue
  label: string
  count: number
}

// Counts follow the current search and filters on every tab. Collections counts
// the collections that have a matching reference.
export function referenceTabs(counts: ReferenceCounts | undefined): ReferenceTab[] {
  return [
    { value: 'all', label: 'All references', count: counts?.all ?? 0 },
    { value: 'mine', label: 'My references', count: counts?.mine ?? 0 },
    { value: 'favorites', label: 'Favorites', count: counts?.favorites ?? 0 },
    { value: 'collections', label: 'Collections', count: counts?.collections ?? 0 },
  ]
}
