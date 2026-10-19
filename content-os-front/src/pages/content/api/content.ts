import { http, type Schemas } from '@/shared/api'

export type ContentList = Schemas['ContentList']
export type ContentItemResponse = Schemas['ContentItemResponse']
export type ContentFilterOptions = Schemas['ContentFilters']
export type ContentStatus = Schemas['ContentStatus']
export type ContentScope = 'all' | 'mine'
export type ContentSort = 'newest' | 'oldest' | 'name_asc' | 'name_desc'

export interface ContentQuery {
  // All content or My content; the counts come for both tabs.
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
