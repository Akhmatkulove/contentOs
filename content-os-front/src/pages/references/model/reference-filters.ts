import { queryParam, type QueryParams } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'
import type {
  ReferenceFilterOptions,
  ReferenceSort,
  ReferenceType,
  ReferencesQuery,
} from '../api/references'

// Reka Select can't hold an empty value, so "All …" is this sentinel.
export const ALL = 'all'

export interface ReferenceFilters {
  type: string
  productId: string
  authorId: string
  tag: string
  sort: ReferenceSort
}

export const defaultFilters: ReferenceFilters = {
  type: ALL,
  productId: ALL,
  authorId: ALL,
  tag: ALL,
  sort: 'newest',
}

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

export const typeOptions = [
  { value: ALL, label: 'All types' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'moodboard', label: 'Moodboard' },
] as const satisfies readonly (SelectOption & { value: ReferenceType | typeof ALL })[]

export const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_asc', label: 'Name: A–Z' },
  { value: 'title_desc', label: 'Name: Z–A' },
] as const satisfies readonly (SelectOption & { value: ReferenceSort })[]

// A creator option keeps the photo: the mobile sheet shows avatars.
export interface CreatorOption extends SelectOption {
  photoUrl: string | null
}

// Options of the pool-dependent filters, each starting with "All …".
export function filterOptions(options: ReferenceFilterOptions | undefined) {
  return {
    products: [
      { value: ALL, label: 'All products' },
      ...(options?.products ?? []).map((product) => ({ value: product.id, label: product.name })),
    ] satisfies SelectOption[],
    creators: [
      { value: ALL, label: 'All creators', photoUrl: null },
      ...(options?.authors ?? []).map((author) => ({
        value: author.id,
        label: author.name || 'Unnamed',
        photoUrl: author.photo_url,
      })),
    ] satisfies CreatorOption[],
    tags: [
      { value: ALL, label: 'All tags' },
      ...(options?.tags ?? []).map((tag) => ({ value: tag, label: tag })),
    ] satisfies SelectOption[],
  }
}

export type FilterOptions = ReturnType<typeof filterOptions>

const orUndefined = <T extends string>(value: string) => (value === ALL ? undefined : (value as T))

// The filters as request params: "All …" sends nothing.
export function filterParams(
  filters: ReferenceFilters,
): Pick<ReferencesQuery, 'type' | 'productId' | 'authorId' | 'tag' | 'sort'> {
  return {
    type: orUndefined<ReferenceType>(filters.type),
    productId: orUndefined(filters.productId),
    authorId: orUndefined(filters.authorId),
    tag: orUndefined(filters.tag),
    sort: filters.sort,
  }
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
