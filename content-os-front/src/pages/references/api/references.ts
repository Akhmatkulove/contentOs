import { http, type Schemas } from '@/shared/api'

export type ReferenceList = Schemas['ReferenceList']
export type ReferenceFilterOptions = Schemas['ReferenceFilters']
export type ReferenceSort = Schemas['ReferenceSort']
export type ReferenceScope = Schemas['ReferenceScope']
export type ReferenceCounts = Schemas['ReferenceCounts']
export type ReferenceCreate = Schemas['ReferenceCreate']
export type ProductOption = Schemas['ProductOption']
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
// with their deliverables (docs/adr/0004).
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

// Idempotent on the backend: repeating either call changes nothing.
export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  const url = `/references/${id}/favorite`
  await (favorite ? http.put(url) : http.delete(url))
}

// The user's own reference in the pool: files already uploaded (POST /uploads) or a link.
export async function createReference(body: ReferenceCreate): Promise<void> {
  await http.post('/references', body)
}

// Every product the user sees, by name: the Product field of "Add reference".
export async function fetchProductOptions(): Promise<ProductOption[]> {
  return (await http.get<ProductOption[]>('/products/options')).data
}
