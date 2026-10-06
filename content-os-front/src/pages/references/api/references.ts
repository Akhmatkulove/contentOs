import { http, type Schemas } from '@/shared/api'

export type ReferenceList = Schemas['ReferenceList']

export interface ReferencesQuery {
  page: number
  perPage: number
}

// The pool the user sees: for an art director, the references of products
// with their deliverables (docs/adr/0004).
export async function fetchReferences({ page, perPage }: ReferencesQuery): Promise<ReferenceList> {
  return (await http.get<ReferenceList>('/references', { params: { page, per_page: perPage } }))
    .data
}
