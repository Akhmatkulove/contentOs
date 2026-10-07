import { computed } from 'vue'
import { useQueryParams } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'
import { shootQueryParams } from './shoot-filters'

type FilterKey = 'status' | 'date' | 'location' | 'sort'

// The shoots toolbar: search and filters, kept in the URL like the products list.
// TODO(api): fetch the shoots with these params.
export function useShootsList() {
  const { state: query, update } = useQueryParams(shootQueryParams)

  const search = computed({
    get: () => query.search,
    set: (value) => (query.search = value),
  })

  // VSelect holds undefined for "not chosen" (shows the placeholder); the URL holds ''.
  // Values come from the select's own options, which the URL params accept.
  const filter = (key: FilterKey) =>
    computed({
      get: () => query[key] || undefined,
      set: (value: string | undefined) => update({ [key]: value ?? '' }),
    })

  // TODO(api): locations from the backend.
  const locations: SelectOption[] = []

  return {
    search,
    status: filter('status'),
    date: filter('date'),
    location: filter('location'),
    sort: filter('sort'),
    locations,
  }
}
