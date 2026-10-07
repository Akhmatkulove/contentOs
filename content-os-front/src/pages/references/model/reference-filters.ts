import { ALL, type ReferenceFilters } from '@/entities/reference'
import { queryParam, type QueryParams } from '@/shared/lib'

// The pool's state in the URL: /references?tab=favorites&type=video&product=…&page=2.
export const referenceQueryParams = {
  scope: queryParam.oneOf(['all', 'mine', 'favorites'], 'all', 'tab'),
  search: queryParam.text(),
  type: queryParam.oneOf([ALL, 'video', 'image', 'moodboard'], ALL),
  productId: queryParam.text(ALL, 'product'),
  authorId: queryParam.text(ALL, 'creator'),
  tag: queryParam.text(ALL),
  sort: queryParam.oneOf(['newest', 'oldest', 'title_asc', 'title_desc'], 'newest'),
  page: queryParam.page(),
} satisfies QueryParams

// The filters alone, without the tab, search and page: what the sheet edits.
export function pickFilters(filters: ReferenceFilters): ReferenceFilters {
  const { type, productId, authorId, tag, sort } = filters
  return { type, productId, authorId, tag, sort }
}

// The fields "Clear filters" resets: the search and the filters, not the sort or the tab.
export const clearableFields = ['search', 'type', 'productId', 'authorId', 'tag'] as const

// How many things narrow the list: the search and each filter.
export function activeFilterCount(filters: ReferenceFilters, search: string): number {
  return (
    [filters.type, filters.productId, filters.authorId, filters.tag].filter(
      (value) => value !== ALL,
    ).length + Number(search !== '')
  )
}

// Something narrows the list (the sort doesn't): the filter button turns active.
export function isFiltered(filters: ReferenceFilters): boolean {
  return [filters.type, filters.productId, filters.authorId, filters.tag].some(
    (value) => value !== ALL,
  )
}

// "3 references" above the list while something narrows it.
export function foundLabel(count: number): string {
  return `${count} ${count === 1 ? 'reference' : 'references'}`
}
