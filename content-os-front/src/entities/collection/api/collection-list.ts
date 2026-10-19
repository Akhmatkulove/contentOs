import { http, type Schemas } from '@/shared/api'

export type CollectionOption = Schemas['CollectionOption']

// The collections the user sees (docs/adr/0014): their own, and those of the
// brands and art directors above them in the team.
export async function fetchCollections(): Promise<CollectionOption[]> {
  return (await http.get<CollectionOption[]>('/collections')).data
}
