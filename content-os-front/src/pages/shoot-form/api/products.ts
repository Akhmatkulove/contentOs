import { http, type Schemas } from '@/shared/api'
import type { ShootProduct } from '../model/shoot-draft'

export type ProductList = Schemas['ProductList']

// One page of the products the user sees (an art director: the ones assigned to
// them, docs/adr/0004), newest first.
export async function fetchProductsPage(
  search: string,
  page: number,
  perPage: number,
): Promise<ProductList> {
  const params = { search: search || undefined, sort: 'newest', page, per_page: perPage }
  return (await http.get<ProductList>('/products', { params })).data
}

export function toShootProduct(item: Schemas['ProductListItem']): ShootProduct {
  return {
    id: item.id,
    name: item.name,
    collection: item.collection ?? '',
    photoUrl: item.photo?.url ?? null,
  }
}
