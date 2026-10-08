import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'
import { useSessionStore } from '@/entities/session'
import { useQueryParams } from '@/shared/lib'
import { fetchShoots, type ShootPeriod } from '../api/shoots'
import { toShoot } from './shoot'
import { shootQueryParams, shootTabs, type ShootTabValue } from './shoot-filters'

export const SHOOTS_PER_PAGE = 20

type FilterKey = 'date' | 'sort'

// The shoots the user sees: the art director's own, or the ones a creator is on
// (docs/adr/0007). Search, filters, tab and page live in the URL like the
// products list; the server searches, filters and pages.
export function useShootsList() {
  const { state: query, update } = useQueryParams(shootQueryParams, { page: 'page' })
  const session = useSessionStore()
  // The art director creates a shoot and becomes its art director.
  const canCreate = computed(() => session.me?.role === 'art_director')

  const search = computed({
    get: () => query.search,
    set: (value) => (query.search = value),
  })
  const page = computed({
    get: () => query.page,
    set: (value) => (query.page = value),
  })

  // VSelect holds undefined for "not chosen" (shows the placeholder); the URL holds ''.
  // Values come from the select's own options, which the URL params accept.
  const filter = (key: FilterKey | 'status') =>
    computed({
      get: () => query[key] || undefined,
      set: (value: string | undefined) => update({ [key]: value ?? '' }),
    })

  // A tab is a status; All is none. "To shoot" from the Status select has no tab.
  const tab = computed({
    get: (): string => query.status || 'all',
    set: (value: string) =>
      update({ status: value === 'all' ? '' : (value as Exclude<ShootTabValue, 'all'>) }),
  })

  const { data, isLoading } = useQuery({
    key: () => ['shoots', { ...query }],
    query: () =>
      fetchShoots({
        search: query.search,
        status: query.status || undefined,
        period: query.date || undefined,
        sort: query.sort || undefined,
        page: query.page,
        perPage: SHOOTS_PER_PAGE,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  const shoots = computed(() => (data.value?.items ?? []).map(toShoot))
  const total = computed(() => data.value?.total ?? 0)
  const tabs = computed(() => shootTabs(data.value?.counts))
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)

  return {
    search,
    status: filter('status'),
    date: filter('date'),
    sort: filter('sort'),
    tab,
    tabs,
    shoots,
    total,
    loading,
    page,
    canCreate,
  }
}

// Figma "Card / Next shoot": the closest shoot that hasn't started yet.
export function useNextShoot() {
  const { data, isLoading } = useQuery({
    key: ['shoots', 'next'],
    query: () => fetchShoots({ status: 'upcoming', sort: 'oldest', perPage: 1 }),
  })
  const shoot = computed(() => {
    const item = data.value?.items[0]
    return item ? toShoot(item) : null
  })
  return { shoot, loading: computed(() => isLoading.value && data.value === undefined) }
}

// Figma "Card / Shoot overview": how many shoots in the period, per status. The
// period is the card's own, not the list's Date filter.
export function useShootOverview() {
  const period = ref<ShootPeriod>('last_6_months')
  const { data } = useQuery({
    key: () => ['shoots', 'overview', period.value],
    // Only the counts are needed: one item is the smallest page.
    query: () => fetchShoots({ period: period.value, perPage: 1 }),
    placeholderData: (previous) => previous,
  })
  const counts = computed(() => data.value?.counts)

  // VSelect emits a plain string; it only offers dateFilterOptions.
  function setPeriod(value: string | undefined) {
    if (value) period.value = value as ShootPeriod
  }
  return { period, setPeriod, counts }
}
