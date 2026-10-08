import { useInfiniteQuery } from '@pinia/colada'
import { computed, ref } from 'vue'
import { fetchProducts, productKeys } from '@/entities/product'
import { nextPage } from './paging'
import { toShootProduct, type ShootProduct } from './shoot-draft'

export const PRODUCTS_PAGE_SIZE = 30

// What "Browse all products" shows: the products the art director sees,
// searched and loaded page by page, and which of them are picked. The pick
// starts from what the shoot already has.
export function useProductPicker(initial: ShootProduct[]) {
  const search = ref('')
  // In the order they were picked; kept whole so the result needs no lookup.
  const picked = ref<ShootProduct[]>([...initial])

  const { data, isLoading, error, hasNextPage, loadNextPage, asyncStatus } = useInfiniteQuery({
    key: () => productKeys.picker(search.value),
    query: ({ pageParam }) =>
      fetchProducts({
        search: search.value,
        sort: 'newest',
        page: pageParam,
        perPage: PRODUCTS_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, page) => nextPage(last.total, page, PRODUCTS_PAGE_SIZE),
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
