import { http, type Schemas } from '@/shared/api'

export type ShootCreate = Schemas['ShootCreate']
export type CreatedShoot = Schemas['ShootListItem']

// The shoot with its team, products, references and deliverables in one request.
export async function createShoot(body: ShootCreate): Promise<CreatedShoot> {
  return (await http.post<CreatedShoot>('/shoots', body)).data
}
