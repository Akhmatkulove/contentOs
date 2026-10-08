import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchShoot } from '../api/shoot'
import { shootKey } from './shoot'

// One shoot with its team, products, references and deliverables. The screen
// shows load errors itself (404: no such shoot, or the user isn't on it).
export function useShoot(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => shootKey(toValue(id)),
    query: () => fetchShoot(toValue(id)),
    meta: { toast: false },
  })
}
