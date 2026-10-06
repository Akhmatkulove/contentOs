import type { LocationQuery } from 'vue-router'
import type { ReferenceCounts, ReferenceScope } from '../api/references'

// The tab lives in the URL (?tab=favorites): reload and Back keep it.
// "All references" is the default and leaves the URL clean.
export function scopeFromQuery(query: LocationQuery): ReferenceScope {
  return query.tab === 'favorites' ? 'favorites' : 'all'
}

export function queryForScope(query: LocationQuery, scope: ReferenceScope): LocationQuery {
  const rest = { ...query }
  delete rest.tab
  return scope === 'all' ? rest : { ...rest, tab: scope }
}

export interface ReferenceTab {
  value: ReferenceScope
  label: string
  count: number
}

// Counts follow the current search and filters on every tab.
export function referenceTabs(counts: ReferenceCounts | undefined): ReferenceTab[] {
  return [
    { value: 'all', label: 'All references', count: counts?.all ?? 0 },
    { value: 'favorites', label: 'Favorites', count: counts?.favorites ?? 0 },
  ]
}
