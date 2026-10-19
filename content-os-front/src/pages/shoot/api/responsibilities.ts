import type { ShootDetails } from '@/entities/shoot'
import { http, type Schemas } from '@/shared/api'

export type ResponsibilitiesBody = Schemas['ShootResponsibilitiesUpdate']

// A creator's or mobilographer's responsibilities on the Team tab; the shoot's
// author only. An empty text clears them. Answers with the whole shoot.
export async function setResponsibilities(
  shootId: string,
  userId: string,
  body: ResponsibilitiesBody,
): Promise<ShootDetails> {
  return (
    await http.put<ShootDetails>(`/shoots/${shootId}/members/${userId}/responsibilities`, body)
  ).data
}
