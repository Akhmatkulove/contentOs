import { useQuery } from '@pinia/colada'
import { useSessionStore } from '@/entities/session'
import { computed, ref, watch } from 'vue'
import { fetchProducts } from '../api/products'
import { toProduct } from './product'

export const PRODUCTS_PER_PAGE = 8

// The products the user sees, searched and paged on the backend.
// TODO(ui): Collection, Status and Sort filters need the VSelect filter variant.
export function useProductsList() {
  const session = useSessionStore()
  // Brands add products; art directors get them through deliverables (docs/adr/0004).
  const canCreate = computed(() => session.me?.role === 'brand')
  const search = ref('')
  const page = ref(1)

  // A new search starts from the first page.
  watch(search, () => {
    page.value = 1
  })

  const { data, isLoading } = useQuery({
    key: () => ['products', { search: search.value, page: page.value }],
    query: () =>
      fetchProducts({ search: search.value, page: page.value, perPage: PRODUCTS_PER_PAGE }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  const products = computed(() => (data.value?.items ?? []).map(toProduct))
  const total = computed(() => data.value?.total ?? 0)

  // The user has no products at all, as opposed to a search that found
  // nothing: then the page shows the "add your first product" screen instead
  // of filters and an empty grid.
  const isEmpty = computed(() => data.value !== undefined && total.value === 0 && !search.value)
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)

  return { products, total, isEmpty, loading, search, page, canCreate }
}
