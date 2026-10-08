import { useInfiniteQuery, useQuery } from '@pinia/colada'
import { computed, reactive, ref } from 'vue'
import {
  defaultFilters,
  fetchReferenceFilters,
  fetchReferences,
  filterOptions,
  filterParams,
  referenceKeys,
  toReference,
  type Reference,
  type ReferenceFilters,
} from '@/entities/reference'
import { nextPage } from './paging'

export const REFERENCES_PAGE_SIZE = 30

// What "Browse reference bank" shows: the reference pool the art director sees,
// searched, filtered as on the references page and loaded page by page, and
// which references are picked. The pick starts from what the shoot already has.
export function useReferencePicker(initial: Reference[]) {
  const search = ref('')
  const filters = reactive<ReferenceFilters>({ ...defaultFilters })
  // In the order they were picked; kept whole so the result needs no lookup.
  const picked = ref<Reference[]>([...initial])

  const { data, isLoading, error, hasNextPage, loadNextPage, asyncStatus } = useInfiniteQuery({
    key: () => referenceKeys.picker({ search: search.value, ...filters }),
    query: ({ pageParam }) =>
      fetchReferences({
        search: search.value,
        ...filterParams(filters),
        scope: 'all',
        page: pageParam,
        perPage: REFERENCES_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, page) => nextPage(last.total, page, REFERENCES_PAGE_SIZE),
    // The modal says what went wrong itself.
    meta: { toast: false },
  })

  // Same cache entry as the references page: the pool's products, creators and tags.
  const { data: optionsData } = useQuery({
    key: referenceKeys.filters,
    query: fetchReferenceFilters,
  })
  const options = computed(() => filterOptions(optionsData.value))

  const references = computed(() =>
    (data.value?.pages ?? []).flatMap((page) => page.items.map(toReference)),
  )

  function isPicked(id: string) {
    return picked.value.some((reference) => reference.id === id)
  }

  function setPicked(reference: Reference, value: boolean) {
    const rest = picked.value.filter((item) => item.id !== reference.id)
    picked.value = value ? [...rest, reference] : rest
  }

  // VSelect emits a plain string; each select only offers its own values.
  function setFilter(key: keyof ReferenceFilters, value: string | undefined) {
    if (value) Object.assign(filters, { [key]: value })
  }

  return {
    search,
    filters,
    options,
    setFilter,
    references,
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
