import { http, type Schemas } from '@/shared/api'

type ShootList = Schemas['ShootList']
export type ShootListItem = Schemas['ShootListItem']
export type ShootCounts = Schemas['ShootCounts']
export type ShootStatus = Schemas['ShootStatus']
export type ShootPeriod = Schemas['ShootPeriod']
export type ShootSort = Schemas['ShootSort']

interface ShootsQuery {
  search?: string
  status?: ShootStatus
  period?: ShootPeriod
  sort?: ShootSort
  page?: number
  perPage?: number
}

// The art director's shoots, or the ones a creator is on (docs/adr/0007).
export async function fetchShoots(query: ShootsQuery): Promise<ShootList> {
  const params = {
    search: query.search || undefined,
    status: query.status,
    period: query.period,
    sort: query.sort,
    page: query.page,
    per_page: query.perPage,
  }
  return (await http.get<ShootList>('/shoots', { params })).data
}
