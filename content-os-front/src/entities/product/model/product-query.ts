import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchProduct } from '../api/product'
import { productKey } from './product'

// One product with its photos, references and deliverables. The screen shows
// load errors itself (404: no such product, or not the user's to see).
export function useProduct(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => productKey(toValue(id)),
    query: () => fetchProduct(toValue(id)),
    meta: { toast: false },
  })
}
