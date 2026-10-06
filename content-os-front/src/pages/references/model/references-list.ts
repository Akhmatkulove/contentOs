import { useQuery } from '@pinia/colada'
import { useMediaQuery } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchReferenceFilters, fetchReferences, type ReferenceScope } from '../api/references'
import { useFavorites } from './favorites'
import { openFiltersSheet } from './filters-sheet'
import { toReference } from '@/entities/reference'
import {
  defaultFilters,
  filterOptions,
  filterParams,
  isFiltered,
  type ReferenceFilters,
} from './reference-filters'
import { queryForScope, referenceTabs, scopeFromQuery } from './reference-tabs'

export const REFERENCES_PER_PAGE = 20

// The user's reference pool: searched, filtered, sorted and paged on the backend.
// TODO(ui): Shoots filter — shoots don't exist yet.
export function useReferencesList() {
  const search = ref('')
  const filters = reactive<ReferenceFilters>({ ...defaultFilters })
  const page = ref(1)

  const route = useRoute()
  const router = useRouter()
  const scope = computed<ReferenceScope>({
    get: () => scopeFromQuery(route.query),
    set: (value) => void router.replace({ query: queryForScope(route.query, value) }),
  })

  // A new tab, search or filter starts from the first page. Sync, so the query
  // key never pairs the new tab with the old page (one request, not two).
  watch(
    [scope, search, () => ({ ...filters })],
    () => {
      page.value = 1
    },
    { flush: 'sync' },
  )

  const { data, isLoading, isPlaceholderData } = useQuery({
    key: () => [
      'references',
      'list',
      { scope: scope.value, search: search.value, ...filters, page: page.value },
    ],
    query: () =>
      fetchReferences({
        scope: scope.value,
        search: search.value,
        ...filterParams(filters),
        page: page.value,
        perPage: REFERENCES_PER_PAGE,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  const { data: optionsData } = useQuery({
    key: ['references', 'filters'],
    query: fetchReferenceFilters,
  })
  const options = computed(() => filterOptions(optionsData.value))

  const favorites = useFavorites()
  const references = computed(() =>
    (data.value?.items ?? []).map((item) => favorites.withPending(toReference(item))),
  )
  const total = computed(() => data.value?.total ?? 0)
  const tabs = computed(() => referenceTabs(data.value?.counts))
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)
  // Old cards on screen while the new page or filter loads: dimmed.
  const refreshing = computed(() => isPlaceholderData.value)
  const filtered = computed(() => isFiltered(filters) || search.value !== '')

  // Figma: the long placeholder on desktop, a short one in the narrow mobile field.
  const desktop = useMediaQuery('(min-width: 48rem)')
  const searchPlaceholder = computed(() =>
    desktop.value ? 'Search references by title, tag, or description…' : 'Search references…',
  )

  async function openFilters() {
    const applied = await openFiltersSheet({ ...filters }, options.value)
    if (applied) Object.assign(filters, applied)
  }

  return {
    scope,
    tabs,
    search,
    filters,
    options,
    references,
    total,
    loading,
    refreshing,
    page,
    filtered,
    searchPlaceholder,
    filtersActive: computed(() => isFiltered(filters)),
    openFilters,
    toggleFavorite: favorites.toggle,
  }
}
