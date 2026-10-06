import { http, type Schemas } from '@/shared/api'

export type ProductDetails = Schemas['ProductResponse']

// Everything the product page shows; 404 when the user doesn't see the product.
export async function fetchProduct(id: string): Promise<ProductDetails> {
  return (await http.get<ProductDetails>(`/products/${id}`)).data
}

// Fields changed outside the edit form: the status from the "…" menu.
export async function patchProduct(
  id: string,
  body: Schemas['ProductPatch'],
): Promise<ProductDetails> {
  return (await http.patch<ProductDetails>(`/products/${id}`, body)).data
}
