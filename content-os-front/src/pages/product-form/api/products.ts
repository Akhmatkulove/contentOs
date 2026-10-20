import { http, type Schemas } from '@/shared/api'

export type ProductCreate = Schemas['ProductCreate']
type ProductUpdate = Schemas['ProductUpdate']
type SavedProduct = Schemas['ProductResponse']

export async function createProduct(body: ProductCreate): Promise<SavedProduct> {
  return (await http.post<SavedProduct>('/products', body)).data
}

// The whole edit form at once: kept and new photos, references and deliverables
// (docs/adr/0005).
export async function updateProduct(id: string, body: ProductUpdate): Promise<SavedProduct> {
  return (await http.put<SavedProduct>(`/products/${id}`, body)).data
}
