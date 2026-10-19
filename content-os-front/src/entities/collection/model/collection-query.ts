import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { fetchCollections } from '../api/collection-list'
import { collectionKeys } from './collection-keys'

// Names for the Collection field, already in order. A typed name that isn't
// among them is created on save. Without the list the field still takes text,
// so a failed load shows no toast.
export function useCollectionNames() {
  const { data } = useQuery({
    key: collectionKeys.list,
    query: fetchCollections,
    meta: { toast: false },
  })
  return computed(() => (data.value ?? []).map((collection) => collection.name))
}
