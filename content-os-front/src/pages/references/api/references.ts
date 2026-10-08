import { http, type Schemas } from '@/shared/api'

export type ReferenceCounts = Schemas['ReferenceCounts']
export type ProductOption = Schemas['ProductOption']

// Idempotent on the backend: repeating either call changes nothing.
export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  const url = `/references/${id}/favorite`
  await (favorite ? http.put(url) : http.delete(url))
}

// Every product the user sees, by name: the Product field of "Add reference".
export async function fetchProductOptions(): Promise<ProductOption[]> {
  return (await http.get<ProductOption[]>('/products/options')).data
}
