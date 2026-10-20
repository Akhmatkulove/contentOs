import { useQuery } from '@pinia/colada'
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import { contentKeys } from '@/entities/content'
import { useSessionStore } from '@/entities/session'
import { useQueryParams } from '@/shared/lib'
import { fetchContent, fetchContentFilters } from '../api/content'
import {
  ALL,
  activeFilterCount,
  clearableFields,
  contentQueryParams,
  appliedScope,
  contentTabs,
  filterOptions,
  filterParams,
  isFiltered,
  pickFilters,
} from './content-filters'
import { openFiltersSheet } from './filters-sheet'

export const CONTENT_PER_PAGE = 20

// Approved files sent to the brand (docs/adr/0025): searched, filtered, sorted and
// paged on the backend. The tab, search, filters, sort and page live in the URL.
export function useContentList() {
  const { state: filters, update, reset } = useQueryParams(contentQueryParams, { page: 'page' })

  // Favorites are the brand's tab (docs/adr/0026).
  const session = useSessionStore()
  const showFavorites = computed(() => session.me?.role === 'brand')
  const scope = computed({
    get: () => appliedScope(filters.scope, showFavorites.value),
    set: (value) => (filters.scope = value),
  })
  const search = computed({
    get: () => filters.search,
    set: (value) => (filters.search = value),
  })
  const page = computed({
    get: () => filters.page,
    set: (value) => (filters.page = value),
  })

  // A brand doesn't see shoots: no shoot filter, and a ?shoot= from an old link is ignored.
  const showShoots = computed(() => session.me?.role !== 'brand')
  const applied = computed(() =>
    showShoots.value ? pickFilters(filters) : { ...pickFilters(filters), shootId: ALL },
  )

  const list = useQuery({
    key: () => contentKeys.list({ ...filters, scope: scope.value, ...applied.value }),
    query: () =>
      fetchContent({
        scope: scope.value,
        search: filters.search,
        ...filterParams(applied.value),
        page: filters.page,
        perPage: CONTENT_PER_PAGE,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  const { data: optionsData } = useQuery({
    key: contentKeys.filters,
    query: fetchContentFilters,
  })
  const options = computed(() => filterOptions(optionsData.value))

  const items = computed(() => list.data.value?.items ?? [])
  const total = computed(() => list.data.value?.total ?? 0)
  const tabs = computed(() => contentTabs(list.data.value?.counts, showFavorites.value))
  // Nothing to show yet: the first load.
  const loading = computed(() => list.isLoading.value && list.data.value === undefined)
  // Old cards on screen while the new page or filter loads: dimmed.
  const refreshing = computed(() => list.isPlaceholderData.value)
  const filtered = computed(() => isFiltered(applied.value) || filters.search !== '')

  // Figma: the long placeholder on desktop, a short one in the narrow mobile field.
  const desktop = useMediaQuery('(min-width: 48rem)')
  const searchPlaceholder = computed(() =>
    desktop.value ? 'Search by product, shoot, creator…' : 'Search content…',
  )

  const activeFilters = computed(() => activeFilterCount(applied.value, filters.search))
  function clearFilters() {
    reset(clearableFields)
  }

  async function openFilters() {
    const next = await openFiltersSheet(applied.value, options.value, showShoots.value)
    // One update: one navigation, back to the first page.
    if (next) update(next)
  }

  return {
    scope,
    tabs,
    search,
    filters,
    options,
    showShoots,
    items,
    total,
    loading,
    refreshing,
    page,
    filtered,
    searchPlaceholder,
    filtersActive: computed(() => isFiltered(applied.value)),
    openFilters,
    activeFilters,
    clearFilters,
  }
}
