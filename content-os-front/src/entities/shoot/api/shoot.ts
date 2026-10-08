import { http, type Schemas } from '@/shared/api'

export type ShootDetails = Schemas['ShootResponse']

// Everything the shoot page and the edit form show; 404 when the user isn't on
// the shoot (docs/adr/0008).
export async function fetchShoot(id: string): Promise<ShootDetails> {
  return (await http.get<ShootDetails>(`/shoots/${id}`)).data
}
