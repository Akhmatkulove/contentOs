import { useQuery } from '@pinia/colada'
import { computed, reactive, ref, watch } from 'vue'
import { useSessionStore } from '@/entities/session'
import { fetchProductFilters, fetchProducts, type ProductSort } from '../api/products'
import { openFiltersSheet } from './filters-sheet'
import { toProduct } from './product'
import {
  collectionOptions,
  defaultFilters,
  filterParams,
  isFiltered,
  type ProductFilters,
} from './product-filters'

export const PRODUCTS_PER_PAGE = 8

// The products the user sees: searched, filtered, sorted and paged on the backend.
// Desktop filters are selects in the toolbar; mobile ones live in a sheet.
export function useProductsList() {
  const session = useSessionStore()
  // Brands add products; art directors get them through deliverables (docs/adr/0004).
  const canCreate = computed(() => session.me?.role === 'brand')
  const search = ref('')
  const filters = reactive<ProductFilters>({ ...defaultFilters })
  const page = ref(1)

  // A new search or filter starts from the first page. Sync, so the query key
  // never pairs the new filter with the old page (one request, not two).
  watch(
    [search, () => ({ ...filters })],
    () => {
      page.value = 1
    },
    { flush: 'sync' },
  )

  const { data, isLoading } = useQuery({
    key: () => ['products', { search: search.value, ...filters, page: page.value }],
    query: () =>
      fetchProducts({
        search: search.value,
        ...filterParams(filters),
        page: page.value,
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

  // VSelect emits a plain string; the sort select only offers ProductSort values.
  function setSort(value: string | undefined) {
    if (value) filters.sort = value as ProductSort
  }

  async function openFilters() {
    const applied = await openFiltersSheet({ ...filters }, collections.value)
    if (applied) Object.assign(filters, applied)
  }

  const products = computed(() => (data.value?.items ?? []).map(toProduct))
  const total = computed(() => data.value?.total ?? 0)

  // The user has no products at all, as opposed to a search or filter that found
  // nothing: then the page shows the "add your first product" screen instead
  // of filters and an empty grid.
  const isEmpty = computed(
    () => data.value !== undefined && total.value === 0 && !search.value && !isFiltered(filters),
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
    setSort,
    filtersActive: computed(() => isFiltered(filters)),
    openFilters,
    page,
    canCreate,
  }
}
