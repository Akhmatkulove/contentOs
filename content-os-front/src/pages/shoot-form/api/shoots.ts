import { http, type Schemas } from '@/shared/api'

export type ShootCreate = Schemas['ShootCreate']
export type CreatedShoot = Schemas['ShootListItem']

// The shoot with its team, products, references and deliverables in one request.
export async function createShoot(body: ShootCreate): Promise<CreatedShoot> {
  return (await http.post<CreatedShoot>('/shoots', body)).data
}

export type ProductDeliverableOption = Schemas['ProductDeliverableOption']

// The brand's deliverables of these products assigned to the art director: what
// a shoot deliverable closes (docs/adr/0017).
export async function fetchProductDeliverables(
  productIds: string[],
): Promise<ProductDeliverableOption[]> {
  // product_id=a&product_id=b, as FastAPI reads a list.
  const params = new URLSearchParams(productIds.map((id) => ['product_id', id]))
  return (await http.get<ProductDeliverableOption[]>('/shoots/product-deliverables', { params }))
    .data
}

export type SavedShoot = Schemas['ShootResponse']

// The whole edit form: the shoot as it should be now (docs/adr/0008). Saved
// deliverables come with their id, new ones without; the ones left out are removed.
export async function updateShoot(id: string, body: ShootCreate): Promise<SavedShoot> {
  return (await http.put<SavedShoot>(`/shoots/${id}`, body)).data
}
