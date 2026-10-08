import { useQuery } from '@pinia/colada'
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import {
  toReference,
  fetchReferenceFilters,
  fetchReferences,
  type ReferenceScope,
  filterOptions,
  filterParams,
} from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import { useQueryParams } from '@/shared/lib'
import { useFavorites } from './favorites'
import { openFiltersSheet } from './filters-sheet'
import {
  activeFilterCount,
  clearableFields,
  isFiltered,
  pickFilters,
  referenceQueryParams,
} from './reference-filters'
import { referenceTabs } from './reference-tabs'
import { useRemoveReference } from './remove-reference'

export const REFERENCES_PER_PAGE = 20

// The user's reference pool: searched, filtered, sorted and paged on the backend.
// The tab, search, filters, sort and page live in the URL, so a link, reload or
// Back opens the same list; a new tab, search or filter starts from the first page.
// TODO(ui): Shoots filter — shoots don't exist yet.
export function useReferencesList() {
  // `filters` is the URL state itself: v-model="filters.type" writes to the URL.
  const {
    state: filters,
    update,
    reset,
  } = useQueryParams(referenceQueryParams, {
    page: 'page',
  })

  const scope = computed<ReferenceScope>({
    get: () => filters.scope,
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

  const { data, isLoading, isPlaceholderData } = useQuery({
    key: () => ['references', 'list', { ...filters }],
    query: () =>
      fetchReferences({
        scope: filters.scope,
        search: filters.search,
        ...filterParams(filters),
        page: filters.page,
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

  // Only the author may delete a reference (the backend checks it too).
  const session = useSessionStore()
  const ownIds = computed(
    () =>
      new Set(
        (data.value?.items ?? [])
          .filter((item) => item.author_id === session.me?.id)
          .map((item) => item.id),
      ),
  )
  // The last card of a later page deleted: step back instead of an empty page.
  const { remove: removeReference } = useRemoveReference(() => {
    if (filters.page > 1 && data.value?.items.length === 1) filters.page -= 1
  })
  const tabs = computed(() => referenceTabs(data.value?.counts))
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)
  // Old cards on screen while the new page or filter loads: dimmed.
  const refreshing = computed(() => isPlaceholderData.value)
  const filtered = computed(() => isFiltered(filters) || filters.search !== '')

  // Figma: the long placeholder on desktop, a short one in the narrow mobile field.
  const desktop = useMediaQuery('(min-width: 48rem)')
  const searchPlaceholder = computed(() =>
    desktop.value ? 'Search references by title, tag, or description…' : 'Search references…',
  )

  const activeFilters = computed(() => activeFilterCount(filters, filters.search))
  function clearFilters() {
    reset(clearableFields)
  }

  async function openFilters() {
    const applied = await openFiltersSheet(pickFilters(filters), options.value)
    // One update: one navigation, back to the first page.
    if (applied) update(applied)
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
    activeFilters,
    clearFilters,
    toggleFavorite: favorites.toggle,
    canRemove: (id: string) => ownIds.value.has(id),
    removeReference,
  }
}
