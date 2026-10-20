import { http, type Schemas } from '@/shared/api'

type ContentList = Schemas['ContentList']
export type ContentItemResponse = Schemas['ContentItemResponse']
export type ContentFilterOptions = Schemas['ContentFilters']
export type ContentStatus = Schemas['ContentStatus']
export type ContentScope = 'all' | 'mine' | 'favorites'
export type ContentSort = 'newest' | 'oldest' | 'name_asc' | 'name_desc'

export interface ContentQuery {
  // All content, My content or the brand's Favorites; the counts come for every tab.
  scope: ContentScope
  search: string
  productId?: string
  shootId?: string
  authorId?: string
  status?: ContentStatus
  sort: ContentSort
  page: number
  perPage: number
}

// Approved files sent to the brand: searched, filtered, sorted and paged on the backend.
export async function fetchContent(query: ContentQuery): Promise<ContentList> {
  const params = {
    scope: query.scope,
    search: query.search || undefined,
    product_id: query.productId,
    shoot_id: query.shootId,
    author_id: query.authorId,
    status: query.status,
    sort: query.sort,
    page: query.page,
    per_page: query.perPage,
  }
  return (await http.get<ContentList>('/content', { params })).data
}

// Products, shoots and creators found in the visible content; no shoots for a brand.
export async function fetchContentFilters(): Promise<ContentFilterOptions> {
  return (await http.get<ContentFilterOptions>('/content/filters')).data
}

export type ContentDetails = Schemas['ContentDetails']
export type ContentComment = Schemas['ContentCommentResponse']
export type ContentMaterial = Schemas['ContentMaterial']
export type ContentReference = Schemas['ReferenceResponse']

// The content page: a sent deliverable with all its files (docs/adr/0026).
export async function fetchContentDetails(id: string): Promise<ContentDetails> {
  return (await http.get<ContentDetails>(`/content/${id}`)).data
}

// The brand and the shoot's art director comment; everyone else involved is notified.
export async function addComment(id: string, body: string): Promise<ContentComment> {
  return (await http.post<ContentComment>(`/content/${id}/comments`, { body })).data
}

// Only the author deletes their comment.
export async function deleteComment(id: string, commentId: string): Promise<void> {
  await http.delete(`/content/${id}/comments/${commentId}`)
}

// The brand approves every file of the deliverable at once.
export async function approveContent(id: string): Promise<void> {
  await http.post(`/content/${id}/approve`)
}

// The brand's favorites.
export async function setContentFavorite(id: string, favorite: boolean): Promise<void> {
  const url = `/content/${id}/favorite`
  await (favorite ? http.put(url) : http.delete(url))
}
