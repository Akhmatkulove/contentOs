import type { LocationQuery } from 'vue-router'

export const productTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'references', label: 'References' },
  { value: 'deliverables', label: 'Deliverables' },
  { value: 'content', label: 'Content' },
] as const

export type ProductTab = (typeof productTabs)[number]['value']

const values = new Set<string>(productTabs.map((tab) => tab.value))

// The tab lives in the URL (?tab=references), so a link or a reload opens it.
// Overview is the default and leaves the URL clean.
export function tabFromQuery(query: LocationQuery): ProductTab {
  const tab = query.tab
  return typeof tab === 'string' && values.has(tab) ? (tab as ProductTab) : 'overview'
}

export function queryForTab(query: LocationQuery, tab: ProductTab): LocationQuery {
  const rest = { ...query }
  delete rest.tab
  return tab === 'overview' ? rest : { ...rest, tab }
}
