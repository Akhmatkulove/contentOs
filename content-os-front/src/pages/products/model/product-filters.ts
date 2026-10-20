import {
  productStatusOptions,
  type ProductSort,
  type ProductStatus,
  type ProductsQuery,
} from '@/entities/product'
import { queryParam, type QueryParams } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'
import type { ProductFilterOptions } from '../api/products'

// Reka Select can't hold an empty value, so "All …" is this sentinel.
const ALL = 'all'

export interface ProductFilters {
  collection: string
  status: typeof ALL | ProductStatus
  sort: ProductSort
}

export const defaultFilters: ProductFilters = { collection: ALL, status: ALL, sort: 'newest' }

// The list's state in the URL: /products?collection=Autumn%2026&status=archived&page=2.
export const productQueryParams = {
  search: queryParam.text(),
  collection: queryParam.text(ALL),
  status: queryParam.oneOf<ProductFilters['status']>([ALL, 'active', 'archived'], ALL),
  sort: queryParam.oneOf(['newest', 'oldest', 'name_asc', 'name_desc'], 'newest'),
  page: queryParam.page(),
} satisfies QueryParams

export const statusFilterOptions: SelectOption<ProductFilters['status']>[] = [
  { value: ALL, label: 'All statuses' },
  ...productStatusOptions,
]

export const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
] as const satisfies readonly (SelectOption & { value: ProductSort })[]

export function collectionOptions(options: ProductFilterOptions | undefined): SelectOption[] {
  return [
    { value: ALL, label: 'All collections' },
    ...(options?.collections ?? []).map((name) => ({ value: name, label: name })),
  ]
}

// The filters as request params: "All …" sends nothing.
export function filterParams(
  filters: ProductFilters,
): Pick<ProductsQuery, 'collection' | 'status' | 'sort'> {
  return {
    collection: filters.collection === ALL ? undefined : filters.collection,
    status: filters.status === ALL ? undefined : filters.status,
    sort: filters.sort,
  }
}

// How many things narrow the list: the search and each filter. The sort doesn't.
export function activeFilterCount(filters: ProductFilters, search: string): number {
  return [filters.collection !== ALL, filters.status !== ALL, search !== ''].filter(Boolean).length
}

// Something narrows the list (the sort doesn't).
export function isFiltered(filters: ProductFilters): boolean {
  return filters.collection !== ALL || filters.status !== ALL
}
