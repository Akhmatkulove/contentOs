import { queryParam, type QueryParams } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'
import type { ShootCounts, ShootPeriod, ShootSort, ShootStatus } from '../api/shoots'

// A shoot's status is worked out from its date and deliverables (docs/adr/0007, 0009).
export const statusFilterOptions = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'to_shoot', label: 'To shoot' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'completed', label: 'Completed' },
] as const satisfies readonly (SelectOption & { value: ShootStatus })[]

// By the shoot's date; "Last 3 months" also takes the upcoming ones.
export const dateFilterOptions = [
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
] as const satisfies readonly (SelectOption & { value: ShootPeriod })[]

// Newest and oldest by the shoot's date.
export const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
] as const satisfies readonly (SelectOption & { value: ShootSort })[]

const values = <T extends string>(options: readonly { value: T }[]) => [
  '' as const,
  ...options.map((option) => option.value),
]

// The list's state in the URL: /shoots?status=in_progress&sort=oldest&page=2.
// '' is "not chosen": the select shows its placeholder (Figma "Status", "Sort by").
// The tabs and the Status select share `status`: a tab is a status, All is none.
export const shootQueryParams = {
  search: queryParam.text(),
  status: queryParam.oneOf(values(statusFilterOptions), ''),
  date: queryParam.oneOf(values(dateFilterOptions), ''),
  sort: queryParam.oneOf(values(sortOptions), ''),
  page: queryParam.page(),
} satisfies QueryParams

export type ShootTabValue = 'all' | 'upcoming' | 'in_progress' | 'completed'

export interface ShootTab {
  value: ShootTabValue
  label: string
  count: number
}

// Figma "Shoot status tabs". Counts follow the search and filters, not the tab.
export function shootTabs(counts: ShootCounts | undefined): ShootTab[] {
  return [
    { value: 'all', label: 'All', count: counts?.all ?? 0 },
    { value: 'upcoming', label: 'Upcoming', count: counts?.upcoming ?? 0 },
    { value: 'in_progress', label: 'In progress', count: counts?.in_progress ?? 0 },
    { value: 'completed', label: 'Completed', count: counts?.completed ?? 0 },
  ]
}
