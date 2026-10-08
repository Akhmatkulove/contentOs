import { http, type Schemas } from '@/shared/api'

export type ReferenceCreate = Schemas['ReferenceCreate']
export type SavedReference = Schemas['ReferenceResponse']

// The user's own reference in the pool: files already uploaded (POST /uploads) or a link.
export async function createReference(body: ReferenceCreate): Promise<SavedReference> {
  return (await http.post<SavedReference>('/references', body)).data
}
