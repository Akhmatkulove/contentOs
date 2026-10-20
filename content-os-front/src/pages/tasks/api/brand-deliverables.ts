import { http, type Schemas } from '@/shared/api'

type BrandDeliverableList = Schemas['BrandDeliverableList']
export type BrandDeliverableItem = Schemas['BrandDeliverableItem']
export type BrandDeliverableCounts = Schemas['BrandDeliverableCounts']
export type BrandDeliverableStatus = Schemas['BrandDeliverableStatus']
export type BrandDeliverableSort = Schemas['BrandDeliverableSort']
type BrandDeliverableFilterOptions = Schemas['BrandDeliverableFilters']

interface BrandDeliverablesQuery {
  search?: string
  status?: BrandDeliverableStatus
  productId?: string
  brandId?: string
  sort?: BrandDeliverableSort
  page?: number
  perPage?: number
}

// The art director's backlog: brands' deliverables assigned to them (docs/adr/0019).
export async function fetchBrandDeliverables(
  query: BrandDeliverablesQuery,
): Promise<BrandDeliverableList> {
  const params = {
    search: query.search || undefined,
    status: query.status,
    product_id: query.productId,
    brand_id: query.brandId,
    sort: query.sort,
    page: query.page,
    per_page: query.perPage,
  }
  return (await http.get<BrandDeliverableList>('/tasks/brand-deliverables', { params })).data
}

// Products and brands found in the backlog.
export async function fetchBrandDeliverableFilters(): Promise<BrandDeliverableFilterOptions> {
  return (await http.get<BrandDeliverableFilterOptions>('/tasks/brand-deliverables/filters')).data
}
