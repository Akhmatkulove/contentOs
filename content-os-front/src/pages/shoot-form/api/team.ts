import { http } from '@/shared/api'
import type { TeamMember } from '../model/shoot-draft'

// Creators an admin linked to the art director (docs/adr/0002). The same people
// shoot as creators or as the mobilographer: it's one role, "Creator / Mobilograph".
export async function fetchCreators(): Promise<TeamMember[]> {
  return (await http.get<TeamMember[]>('/team/creators')).data
}
