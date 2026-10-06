import { http, type Schemas } from '@/shared/api'

export type TeamMember = Schemas['TeamMember']

// Art directors linked to the brand by the admin (docs/adr/0002).
export async function fetchArtDirectors(): Promise<TeamMember[]> {
  return (await http.get<TeamMember[]>('/team/art-directors')).data
}
