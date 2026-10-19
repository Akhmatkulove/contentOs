import { http, type Schemas } from '@/shared/api'

export type ReferenceCounts = Schemas['ReferenceCounts']
export type ProductOption = Schemas['ProductOption']
export type ReferenceDetails = Schemas['ReferenceResponse']

// The reference page; 404 when the user doesn't see the reference.
export async function fetchReference(id: string): Promise<ReferenceDetails> {
  return (await http.get<ReferenceDetails>(`/references/${id}`)).data
}

// Idempotent on the backend: repeating either call changes nothing.
export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  const url = `/references/${id}/favorite`
  await (favorite ? http.put(url) : http.delete(url))
}

// Only the author can delete; the reference also leaves the shoots that use it.
export async function deleteReference(id: string): Promise<void> {
  await http.delete(`/references/${id}`)
}

// Every product the user sees, by name: the Product field of "Add reference".
export async function fetchProductOptions(): Promise<ProductOption[]> {
  return (await http.get<ProductOption[]>('/products/options')).data
}
