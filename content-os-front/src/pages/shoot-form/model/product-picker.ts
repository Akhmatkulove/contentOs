import { useInfiniteQuery } from '@pinia/colada'
import { computed, ref } from 'vue'
import { fetchProductsPage, toShootProduct, type ProductList } from '../api/products'
import type { ShootProduct } from './shoot-draft'

export const PRODUCTS_PAGE_SIZE = 30

// The page after `page`, or null once every product is loaded.
export function nextProductsPage(last: ProductList, page: number): number | null {
  return page * PRODUCTS_PAGE_SIZE < last.total ? page + 1 : null
}

// What "Browse all products" shows: the products the art director sees,
// searched and loaded page by page, and which of them are picked. The pick
// starts from what the shoot already has.
export function useProductPicker(initial: ShootProduct[]) {
  const search = ref('')
  // In the order they were picked; kept whole so the result needs no lookup.
  const picked = ref<ShootProduct[]>([...initial])

  const { data, isLoading, error, hasNextPage, loadNextPage, asyncStatus } = useInfiniteQuery({
    key: () => ['products', 'picker', search.value],
    query: ({ pageParam }) => fetchProductsPage(search.value, pageParam, PRODUCTS_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, page) => nextProductsPage(last, page),
    // The modal says what went wrong itself.
    meta: { toast: false },
  })

  const products = computed(() =>
    (data.value?.pages ?? []).flatMap((page) => page.items.map(toShootProduct)),
  )

  function isPicked(id: string) {
    return picked.value.some((product) => product.id === id)
  }

  function setPicked(product: ShootProduct, value: boolean) {
    const rest = picked.value.filter((item) => item.id !== product.id)
    picked.value = value ? [...rest, product] : rest
  }

  return {
    search,
    products,
    picked,
    isPicked,
    setPicked,
    loading: isLoading,
    failed: computed(() => error.value !== null),
    hasMore: hasNextPage,
    loadingMore: computed(() => asyncStatus.value === 'loading' && !isLoading.value),
    loadMore: () => loadNextPage(),
  }
}
