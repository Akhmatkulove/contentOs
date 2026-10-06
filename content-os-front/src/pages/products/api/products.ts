import { http, type Schemas } from '@/shared/api'

export type ProductList = Schemas['ProductList']

export interface ProductsQuery {
  search: string
  page: number
  perPage: number
}

export async function fetchProducts({
  search,
  page,
  perPage,
}: ProductsQuery): Promise<ProductList> {
  return (
    await http.get<ProductList>('/products', {
      params: { search: search || undefined, page, per_page: perPage },
    })
  ).data
}
