import { http, type Schemas } from '@/shared/api'

export type ReferenceList = Schemas['ReferenceList']
export type ReferenceFilterOptions = Schemas['ReferenceFilters']
export type ReferenceSort = Schemas['ReferenceSort']
export type ReferenceScope = Schemas['ReferenceScope']
export type ReferenceType = Schemas['ReferenceType']

export interface ReferencesQuery {
  search: string
  type?: ReferenceType
  productId?: string
  authorId?: string
  tag?: string
  sort: ReferenceSort
  // Mine: only what the user created; favorites: only what they starred.
  // The counts come for every tab.
  scope: ReferenceScope
  page: number
  perPage: number
}

// The pool the user sees: for an art director, the references of products
// with their deliverables (docs/adr/0004). The references page and the
// shoot's reference bank both list it.
export async function fetchReferences(query: ReferencesQuery): Promise<ReferenceList> {
  const params = {
    search: query.search || undefined,
    type: query.type,
    product_id: query.productId,
    author_id: query.authorId,
    tag: query.tag,
    sort: query.sort,
    scope: query.scope,
    page: query.page,
    per_page: query.perPage,
  }
  return (await http.get<ReferenceList>('/references', { params })).data
}

// Products, creators and tags found in that pool.
export async function fetchReferenceFilters(): Promise<ReferenceFilterOptions> {
  return (await http.get<ReferenceFilterOptions>('/references/filters')).data
}
