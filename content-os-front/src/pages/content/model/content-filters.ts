import { queryParam, type QueryParams } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'
import type {
  ContentFilterOptions,
  ContentQuery,
  ContentScope,
  ContentSort,
  ContentStatus,
} from '../api/content'

// Reka Select can't hold an empty value, so "All …" is this sentinel.
export const ALL = 'all'

// The page's state in the URL: /content?tab=mine&product=…&status=new&page=2.
export const contentQueryParams = {
  scope: queryParam.oneOf(['all', 'mine', 'favorites'], 'all', 'tab'),
  search: queryParam.text(),
  productId: queryParam.text(ALL, 'product'),
  shootId: queryParam.text(ALL, 'shoot'),
  authorId: queryParam.text(ALL, 'creator'),
  status: queryParam.oneOf([ALL, 'new', 'approved'], ALL),
  sort: queryParam.oneOf(['newest', 'oldest', 'name_asc', 'name_desc'], 'newest'),
  page: queryParam.page(),
} satisfies QueryParams

// What the filters sheet edits: the filters and the sort, without the tab, search and page.
export interface ContentFilters {
  productId: string
  shootId: string
  authorId: string
  status: string
  sort: ContentSort
}

const FILTER_FIELDS = ['productId', 'shootId', 'authorId', 'status'] as const

export function pickFilters(filters: ContentFilters): ContentFilters {
  const { productId, shootId, authorId, status, sort } = filters
  return { productId, shootId, authorId, status, sort }
}

// The fields "Clear filters" resets: the search and the filters, not the sort or the tab.
export const clearableFields = ['search', ...FILTER_FIELDS] as const

// Something narrows the list (the sort doesn't): the filter button turns active.
export function isFiltered(filters: ContentFilters): boolean {
  return FILTER_FIELDS.some((field) => filters[field] !== ALL)
}

// How many things narrow the list: the search and each filter.
export function activeFilterCount(filters: ContentFilters, search: string): number {
  return FILTER_FIELDS.filter((field) => filters[field] !== ALL).length + Number(search !== '')
}

// "3 files" above the list while something narrows it.
export function foundLabel(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`
}

export const statusOptions = [
  { value: ALL, label: 'All status' },
  { value: 'new', label: 'New' },
  { value: 'approved', label: 'Approved' },
] as const satisfies readonly (SelectOption & { value: ContentStatus | typeof ALL })[]

export const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
] as const satisfies readonly (SelectOption & { value: ContentSort })[]

// A creator option keeps the photo: the mobile sheet shows avatars.
export interface CreatorOption extends SelectOption {
  photoUrl: string | null
}

// Options of the content-dependent filters, each starting with "All …".
// `shoots` is empty for a brand: it doesn't see shoots, and the filter is hidden.
export function filterOptions(options: ContentFilterOptions | undefined) {
  return {
    products: [
      { value: ALL, label: 'All products' },
      ...(options?.products ?? []).map((product) => ({ value: product.id, label: product.name })),
    ] satisfies SelectOption[],
    shoots: [
      { value: ALL, label: 'All shoots' },
      ...(options?.shoots ?? []).map((shoot) => ({ value: shoot.id, label: shoot.name })),
    ] satisfies SelectOption[],
    creators: [
      { value: ALL, label: 'All creators', photoUrl: null },
      ...(options?.creators ?? []).map((creator) => ({
        value: creator.id,
        label: creator.name || 'Unnamed',
        photoUrl: creator.photo_url,
      })),
    ] satisfies CreatorOption[],
  }
}

export type FilterOptions = ReturnType<typeof filterOptions>

const orUndefined = <T extends string>(value: string) => (value === ALL ? undefined : (value as T))

// The filters as request params: "All …" sends nothing.
export function filterParams(
  filters: ContentFilters,
): Pick<ContentQuery, 'productId' | 'shootId' | 'authorId' | 'status' | 'sort'> {
  return {
    productId: orUndefined(filters.productId),
    shootId: orUndefined(filters.shootId),
    authorId: orUndefined(filters.authorId),
    status: orUndefined<ContentStatus>(filters.status),
    sort: filters.sort,
  }
}

export interface ContentTab {
  value: ContentScope
  label: string
  count: number
}

// Counts follow the current search and filters on every tab. Favorites are the
// brand's only (docs/adr/0026).
export function contentTabs(
  counts: { all: number; mine: number; favorites: number } | undefined,
  favorites: boolean,
): ContentTab[] {
  const tabs: ContentTab[] = [
    { value: 'all', label: 'All content', count: counts?.all ?? 0 },
    { value: 'mine', label: 'My content', count: counts?.mine ?? 0 },
  ]
  if (favorites)
    tabs.push({ value: 'favorites', label: 'Favorites', count: counts?.favorites ?? 0 })
  return tabs
}

// A ?tab=favorites from someone else's link falls back to All content for a non-brand.
export function appliedScope(scope: ContentScope, favorites: boolean): ContentScope {
  return scope === 'favorites' && !favorites ? 'all' : scope
}
