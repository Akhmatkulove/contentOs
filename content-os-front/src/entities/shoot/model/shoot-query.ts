import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchShoot } from '../api/shoot'
import { shootKeys } from './shoot-keys'

// One shoot with its team, products, references and deliverables. The screen
// shows load errors itself (404: no such shoot, or the user isn't on it).
export function useShoot(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => shootKeys.detail(toValue(id)),
    query: () => fetchShoot(toValue(id)),
    meta: { toast: false },
  })
}
