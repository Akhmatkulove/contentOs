import { http, type Schemas } from '@/shared/api'

export type ShootCreate = Schemas['ShootCreate']
export type CreatedShoot = Schemas['ShootListItem']

// The shoot with its team, products, references and deliverables in one request.
export async function createShoot(body: ShootCreate): Promise<CreatedShoot> {
  return (await http.post<CreatedShoot>('/shoots', body)).data
}

export type SavedShoot = Schemas['ShootResponse']

// The whole edit form: the shoot as it should be now (docs/adr/0008). Saved
// deliverables come with their id, new ones without; the ones left out are removed.
export async function updateShoot(id: string, body: ShootCreate): Promise<SavedShoot> {
  return (await http.put<SavedShoot>(`/shoots/${id}`, body)).data
}
