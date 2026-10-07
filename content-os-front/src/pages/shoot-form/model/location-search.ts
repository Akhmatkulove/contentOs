import { useQuery } from '@pinia/colada'
import { refDebounced } from '@vueuse/core'
import { computed, ref } from 'vue'
import { fetchLocationSuggestions } from '../api/locations'

// The backend answers nothing below two letters, so neither do we ask.
export const MIN_LOCATION_QUERY = 2

// What the Location field's list says instead of suggestions, if anything.
export type LocationSearchState = 'idle' | 'loading' | 'empty' | 'error' | 'results'

export function locationSearchState(input: {
  query: string
  loading: boolean
  failed: boolean
  count: number
}): LocationSearchState {
  if (input.query.trim().length < MIN_LOCATION_QUERY) return 'idle'
  if (input.failed) return 'error'
  if (input.count > 0) return 'results'
  return input.loading ? 'loading' : 'empty'
}

// Address search for the Location field: the typed text, debounced, goes to
// Yandex Geosuggest through the backend. Answers are cached per query.
export function useLocationSearch() {
  const query = ref('')
  const debounced = refDebounced(
    computed(() => query.value.trim()),
    300,
  )
  const enabled = computed(() => debounced.value.length >= MIN_LOCATION_QUERY)

  const { data, isLoading, error } = useQuery({
    key: () => ['locations', 'suggest', debounced.value],
    query: () => fetchLocationSuggestions(debounced.value),
    enabled,
    // Keep the last list on screen while the next query loads.
    placeholderData: (previous) => previous,
    // The field says "search is unavailable" itself.
    meta: { toast: false },
  })

  const suggestions = computed(() => (enabled.value ? (data.value ?? []) : []))

  // Typing counts as loading until the debounce catches up.
  const state = computed(() =>
    locationSearchState({
      query: query.value,
      loading: isLoading.value || query.value.trim() !== debounced.value,
      failed: enabled.value && error.value !== null,
      count: suggestions.value.length,
    }),
  )

  return { query, suggestions, state }
}
