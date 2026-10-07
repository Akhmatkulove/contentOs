import type { ReferenceScope } from '@/entities/reference'
import type { ReferenceCounts } from '../api/references'

export interface ReferenceTab {
  value: ReferenceScope
  label: string
  count: number
}

// Counts follow the current search and filters on every tab.
export function referenceTabs(counts: ReferenceCounts | undefined): ReferenceTab[] {
  return [
    { value: 'all', label: 'All references', count: counts?.all ?? 0 },
    { value: 'mine', label: 'My references', count: counts?.mine ?? 0 },
    { value: 'favorites', label: 'Favorites', count: counts?.favorites ?? 0 },
  ]
}
