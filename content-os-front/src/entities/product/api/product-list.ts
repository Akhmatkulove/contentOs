import { http, type Schemas } from '@/shared/api'

export type ProductList = Schemas['ProductList']
export type ProductListItem = Schemas['ProductListItem']
export type ProductSort = Schemas['ProductSort']

export interface ProductsQuery {
  search: string
  // Exact collection; undefined — all of them.
  collection?: string
  status?: Schemas['ProductStatus']
  sort: ProductSort
  page: number
  perPage: number
}

// The products the user sees: a brand's own, an art director's through their
// deliverables (docs/adr/0004). The products page and the shoot form's
// "Browse all products" both list it.
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
