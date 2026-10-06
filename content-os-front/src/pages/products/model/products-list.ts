import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { useSessionStore } from '@/entities/session'
import { useQueryParams } from '@/shared/lib'
import { fetchProductFilters, fetchProducts, type ProductSort } from '../api/products'
import { openFiltersSheet } from './filters-sheet'
import { toProduct } from './product'
import {
  activeFilterCount,
  collectionOptions,
  filterParams,
  isFiltered,
  productQueryParams,
  type ProductFilters,
} from './product-filters'

export const PRODUCTS_PER_PAGE = 8

// The products the user sees: searched, filtered, sorted and paged on the backend.
// All of it lives in the URL, so a link, reload or Back opens the same list;
// a new search or filter starts from the first page.
// Desktop filters are selects in the toolbar; mobile ones live in a sheet.
export function useProductsList() {
  const session = useSessionStore()
  // Brands add products; art directors get them through deliverables (docs/adr/0004).
  const canCreate = computed(() => session.me?.role === 'brand')
  const { state: query, update, reset } = useQueryParams(productQueryParams, { page: 'page' })

  const search = computed({
    get: () => query.search,
    set: (value) => (query.search = value),
  })
  const page = computed({
    get: () => query.page,
    set: (value) => (query.page = value),
  })
  const filters = computed<ProductFilters>(() => ({
    collection: query.collection,
    status: query.status,
    sort: query.sort,
  }))

  const { data, isLoading } = useQuery({
    key: () => ['products', { ...query }],
    query: () =>
      fetchProducts({
        search: query.search,
        ...filterParams(filters.value),
        page: query.page,
        perPage: PRODUCTS_PER_PAGE,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  // Under ['products']: creating or editing a product refreshes the collections too.
  const { data: filterData } = useQuery({
    key: ['products', 'filters'],
    query: fetchProductFilters,
  })
  const collections = computed(() => collectionOptions(filterData.value))

  function setCollection(value: string | undefined) {
    if (value) update({ collection: value })
  }
  function setStatus(value: string | undefined) {
    if (value) update({ status: value as ProductFilters['status'] })
  }
  // VSelect emits a plain string; the sort select only offers ProductSort values.
  function setSort(value: string | undefined) {
    if (value) update({ sort: value as ProductSort })
  }

  async function openFilters() {
    const applied = await openFiltersSheet({ ...filters.value }, collections.value)
    if (applied) update(applied)
  }

  // Search and filters off; the sort stays, it doesn't hide anything.
  const activeFilters = computed(() => activeFilterCount(filters.value, query.search))
  function clearFilters() {
    reset(['search', 'collection', 'status'])
  }

  const products = computed(() => (data.value?.items ?? []).map(toProduct))
  const total = computed(() => data.value?.total ?? 0)

  // The user has no products at all, as opposed to a search or filter that found
  // nothing: then the page shows the "add your first product" screen instead
  // of filters and an empty grid.
  const isEmpty = computed(
    () =>
      data.value !== undefined && total.value === 0 && !query.search && !isFiltered(filters.value),
  )
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)

  return {
    products,
    total,
    isEmpty,
    loading,
    search,
    filters,
    collections,
    setCollection,
    setStatus,
    setSort,
    filtersActive: computed(() => isFiltered(filters.value)),
    openFilters,
    activeFilters,
    clearFilters,
    page,
    canCreate,
  }
}
