import type { ProductStatus } from '@/entities/product'
import { productStatusOptions } from '@/entities/product'
import type { SelectOption } from '@/shared/ui/select'
import type { ProductFilterOptions, ProductSort, ProductsQuery } from '../api/products'

// Reka Select can't hold an empty value, so "All …" is this sentinel.
export const ALL = 'all'

export interface ProductFilters {
  collection: string
  status: string
  sort: ProductSort
}

export const defaultFilters: ProductFilters = { collection: ALL, status: ALL, sort: 'newest' }

export const statusFilterOptions = [
  { value: ALL, label: 'All statuses' },
  ...productStatusOptions,
] satisfies SelectOption[]

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
    status: filters.status === ALL ? undefined : (filters.status as ProductStatus),
    sort: filters.sort,
  }
}

// Something narrows the list (the sort doesn't).
export function isFiltered(filters: ProductFilters): boolean {
  return filters.collection !== ALL || filters.status !== ALL
}
