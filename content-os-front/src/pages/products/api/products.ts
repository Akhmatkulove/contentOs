import type { ProductStatus } from '@/entities/product'
import { http, type Schemas } from '@/shared/api'

export type ProductList = Schemas['ProductList']
export type ProductSort = Schemas['ProductSort']
export type ProductFilterOptions = Schemas['ProductFilters']

export interface ProductsQuery {
  search: string
  // Exact collection; undefined — all of them.
  collection?: string
  status?: ProductStatus
  sort: ProductSort
  page: number
  perPage: number
}

export async function fetchProducts(query: ProductsQuery): Promise<ProductList> {
  const params = {
    search: query.search || undefined,
    collection: query.collection,
    status: query.status,
    sort: query.sort,
    page: query.page,
    per_page: query.perPage,
  }
  return (await http.get<ProductList>('/products', { params })).data
}

// Collections of the products the user sees: the Collection filter.
export async function fetchProductFilters(): Promise<ProductFilterOptions> {
  return (await http.get<ProductFilterOptions>('/products/filters')).data
}
