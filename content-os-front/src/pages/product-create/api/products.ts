import { http, type Schemas } from '@/shared/api'

export type ProductCreate = Schemas['ProductCreate']
export type CreatedProduct = Schemas['ProductResponse']

export async function createProduct(body: ProductCreate): Promise<CreatedProduct> {
  return (await http.post<CreatedProduct>('/products', body)).data
}
