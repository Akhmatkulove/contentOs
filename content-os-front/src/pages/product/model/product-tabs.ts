import { queryParam } from '@/shared/lib'

export const productTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'references', label: 'References' },
  { value: 'deliverables', label: 'Deliverables' },
  { value: 'content', label: 'Content' },
] as const

export type ProductTab = (typeof productTabs)[number]['value']

// The tab lives in the URL (?tab=references), so a link or a reload opens it.
// Overview is the default and leaves the URL clean.
export const productQueryParams = {
  tab: queryParam.oneOf(
    productTabs.map((tab) => tab.value),
    'overview',
  ),
}
