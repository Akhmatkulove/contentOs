import { http, type Schemas } from '@/shared/api'

export type ReferenceList = Schemas['ReferenceList']
export type ReferenceCollectionList = Schemas['ReferenceCollectionList']
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
  // Only this collection (opened on the Collections tab); the counts ignore it.
  collection?: string
  page: number
  perPage: number
}

export type CollectionsQuery = Omit<ReferencesQuery, 'scope' | 'collection'> & {
  // How many references each collection shows.
  preview: number
}

const searchParams = (query: Omit<ReferencesQuery, 'scope' | 'page' | 'perPage'>) => ({
  search: query.search || undefined,
  type: query.type,
  product_id: query.productId,
  author_id: query.authorId,
  tag: query.tag,
  sort: query.sort,
})

// The pool the user sees: for an art director, the references of products
// with their deliverables (docs/adr/0004). The references page and the
// shoot's reference bank both list it.
export async function fetchReferences(query: ReferencesQuery): Promise<ReferenceList> {
  const params = {
    ...searchParams(query),
    scope: query.scope,
    collection: query.collection,
    page: query.page,
    per_page: query.perPage,
  }
  return (await http.get<ReferenceList>('/references', { params })).data
}

// The Collections tab: collections in alphabetical order, each with how many
// of its references match and the first `preview` of them. Pages go by collection.
export async function fetchReferenceCollections(
  query: CollectionsQuery,
): Promise<ReferenceCollectionList> {
  const params = {
    ...searchParams(query),
    page: query.page,
    per_page: query.perPage,
    preview: query.preview,
  }
  return (await http.get<ReferenceCollectionList>('/references/collections', { params })).data
}

// Products, creators and tags found in that pool.
export async function fetchReferenceFilters(): Promise<ReferenceFilterOptions> {
  return (await http.get<ReferenceFilterOptions>('/references/filters')).data
}
