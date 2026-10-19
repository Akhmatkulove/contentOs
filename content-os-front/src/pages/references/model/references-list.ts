import { useQuery } from '@pinia/colada'
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import {
  toReference,
  fetchReferenceCollections,
  fetchReferenceFilters,
  fetchReferences,
  filterOptions,
  filterParams,
  referenceKeys,
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
import { referenceTabs, type ReferenceTabValue } from './reference-tabs'
import { useRemoveReference } from './remove-reference'

export const REFERENCES_PER_PAGE = 20
// The Collections tab: collections per page and cards in each one's row.
export const COLLECTIONS_PER_PAGE = 6
export const COLLECTION_PREVIEW = 10

// The user's reference pool: searched, filtered, sorted and paged on the backend.
// The tab, search, filters, sort and page live in the URL, so a link, reload or
// Back opens the same list; a new tab, search or filter starts from the first page.
// The Collections tab shows a row per collection (one request for the page); an
// opened collection is the usual paged list of the whole pool narrowed to it.
// TODO(api): Shoots filter — GET /references doesn't filter by shoot.
export function useReferencesList() {
  // `filters` is the URL state itself: v-model="filters.type" writes to the URL.
  const {
    state: filters,
    update,
    reset,
  } = useQueryParams(referenceQueryParams, {
    page: 'page',
  })

  const scope = computed<ReferenceTabValue>({
    get: () => filters.scope,
    // Another tab closes the opened collection.
    set: (value) => update({ scope: value, collection: '' }),
  })
  const search = computed({
    get: () => filters.search,
    set: (value) => (filters.search = value),
  })
  const page = computed({
    get: () => filters.page,
    set: (value) => (filters.page = value),
  })
  // The collection opened on the Collections tab, '' for none.
  const collection = computed(() => (filters.scope === 'collections' ? filters.collection : ''))
  // The page of collections it was opened from: closing goes back there.
  let collectionsPage = 1
  function openCollection(name: string) {
    collectionsPage = filters.page
    filters.collection = name
  }
  function closeCollection() {
    update({ collection: '', page: collectionsPage })
    collectionsPage = 1
  }
  // The Collections tab with nothing opened: a row per collection.
  const grouped = computed(() => filters.scope === 'collections' && !collection.value)

  const list = useQuery({
    key: () => referenceKeys.list({ ...filters }),
    query: () =>
      fetchReferences({
        // An opened collection is taken from the whole pool.
        scope: filters.scope === 'collections' ? 'all' : filters.scope,
        collection: collection.value || undefined,
        search: filters.search,
        ...filterParams(filters),
        page: filters.page,
        perPage: REFERENCES_PER_PAGE,
      }),
    enabled: () => !grouped.value,
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })
  const groups = useQuery({
    key: () => referenceKeys.collections({ ...filters }),
    query: () =>
      fetchReferenceCollections({
        search: filters.search,
        ...filterParams(filters),
        page: filters.page,
        perPage: COLLECTIONS_PER_PAGE,
        preview: COLLECTION_PREVIEW,
      }),
    enabled: grouped,
    placeholderData: (previous) => previous,
  })
  const active = computed(() => (grouped.value ? groups : list))

  const { data: optionsData } = useQuery({
    key: referenceKeys.filters,
    query: fetchReferenceFilters,
  })
  const options = computed(() => filterOptions(optionsData.value))

  const favorites = useFavorites()
  const references = computed(() =>
    (list.data.value?.items ?? []).map((item) => favorites.withPending(toReference(item))),
  )
  const collections = computed(() =>
    (groups.data.value?.items ?? []).map((group) => ({
      name: group.name,
      total: group.total,
      references: group.items.map((item) => favorites.withPending(toReference(item))),
    })),
  )
  // References on the page, or collections on the Collections tab.
  const total = computed(() => active.value.data.value?.total ?? 0)

  // Only the author may delete a reference (the backend checks it too).
  const session = useSessionStore()
  const ownIds = computed(() => {
    const items = grouped.value
      ? (groups.data.value?.items ?? []).flatMap((group) => group.items)
      : (list.data.value?.items ?? [])
    return new Set(items.filter((item) => item.author_id === session.me?.id).map((item) => item.id))
  })
  // The last card of a later page deleted: step back instead of an empty page.
  const { remove: removeReference } = useRemoveReference(() => {
    const last = grouped.value
      ? groups.data.value?.items.length === 1 && groups.data.value.items[0]!.total === 1
      : list.data.value?.items.length === 1
    if (filters.page > 1 && last) filters.page -= 1
  })
  // The other view's counts stand in while a tab loads for the first time.
  const tabs = computed(() =>
    referenceTabs(
      active.value.data.value?.counts ?? (grouped.value ? list : groups).data.value?.counts,
    ),
  )
  // Nothing to show yet: the first load of this view.
  const loading = computed(
    () => active.value.isLoading.value && active.value.data.value === undefined,
  )
  // Old cards on screen while the new page or filter loads: dimmed.
  const refreshing = computed(() => active.value.isPlaceholderData.value)
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
    grouped,
    collection,
    openCollection,
    closeCollection,
    references,
    collections,
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
