import { queryParam, type QueryParams } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'

// TODO(api): statuses, date ranges and sort orders follow the shoots API once it lands;
// locations come from the backend.

export const statusFilterOptions = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'to_shoot', label: 'To shoot' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'completed', label: 'Completed' },
] as const satisfies readonly SelectOption[]

export const dateFilterOptions = [
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
] as const satisfies readonly SelectOption[]

export const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
] as const satisfies readonly SelectOption[]

const values = <T extends string>(options: readonly { value: T }[]) => [
  '' as const,
  ...options.map((option) => option.value),
]

// The toolbar's state in the URL: /shoots?status=in_progress&sort=oldest.
// '' is "not chosen": the select shows its placeholder (Figma "Status", "Sort by").
export const shootQueryParams = {
  search: queryParam.text(),
  status: queryParam.oneOf(values(statusFilterOptions), ''),
  date: queryParam.oneOf(values(dateFilterOptions), ''),
  location: queryParam.text(),
  sort: queryParam.oneOf(values(sortOptions), ''),
} satisfies QueryParams
