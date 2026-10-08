import { http, type Schemas } from '@/shared/api'

export type ProductFilterOptions = Schemas['ProductFilters']

// Collections of the products the user sees: the Collection filter.
export async function fetchProductFilters(): Promise<ProductFilterOptions> {
  return (await http.get<ProductFilterOptions>('/products/filters')).data
}
