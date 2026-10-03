import type { Reference } from '@/entities/reference'

// TODO(api): references endpoint. Until then the list is empty; then load it
// with useQuery.
export function useReferencesList() {
  const references: Reference[] = []
  return { references }
}
