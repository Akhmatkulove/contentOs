import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'
import { fetchReferences } from '../api/references'
import { toReference } from './reference'

export const REFERENCES_PER_PAGE = 12

// The user's reference pool, paged on the backend.
export function useReferencesList() {
  const page = ref(1)

  const { data, isLoading } = useQuery({
    key: () => ['references', { page: page.value }],
    query: () => fetchReferences({ page: page.value, perPage: REFERENCES_PER_PAGE }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  const references = computed(() => (data.value?.items ?? []).map(toReference))
  const total = computed(() => data.value?.total ?? 0)
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)

  return { references, total, loading, page }
}
