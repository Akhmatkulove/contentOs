import { computed, ref } from 'vue'
import type { Product } from './product'

export const PRODUCTS_PER_PAGE = 8

// TODO(api): products endpoint. Until then the list is empty and the
// filters change nothing; then load it with useQuery keyed by search, filters
// and page.
export function useProductsList() {
  const search = ref('')
  const page = ref(1)
  const products: Product[] = []
  const total = products.length

  // The workspace has no products at all, as opposed to a search that found
  // nothing: then the page shows the "add your first product" screen instead
  // of filters and an empty grid. With the API this should check the
  // unfiltered count.
  const isEmpty = computed(() => total === 0 && search.value === '')

  return { products, total, isEmpty, search, page }
}
