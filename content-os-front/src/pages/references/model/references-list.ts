import { useQuery } from '@pinia/colada'
import { useMediaQuery } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'
import { fetchReferenceFilters, fetchReferences } from '../api/references'
import { useFavorites } from './favorites'
import { openFiltersSheet } from './filters-sheet'
import { toReference } from './reference'
import {
  defaultFilters,
  filterOptions,
  filterParams,
  isFiltered,
  type ReferenceFilters,
} from './reference-filters'

export const REFERENCES_PER_PAGE = 20

// The user's reference pool: searched, filtered, sorted and paged on the backend.
// TODO(ui): Shoots filter — shoots don't exist yet.
export function useReferencesList() {
  const search = ref('')
  const filters = reactive<ReferenceFilters>({ ...defaultFilters })
  const page = ref(1)

  // A new search or filter starts from the first page.
  watch([search, () => ({ ...filters })], () => {
    page.value = 1
  })

  const { data, isLoading } = useQuery({
    key: () => ['references', { search: search.value, ...filters, page: page.value }],
    query: () =>
      fetchReferences({
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
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)
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
    search,
    filters,
    options,
    references,
    total,
    loading,
    page,
    filtered,
    searchPlaceholder,
    filtersActive: computed(() => isFiltered(filters)),
    openFilters,
    toggleFavorite: favorites.toggle,
  }
}
