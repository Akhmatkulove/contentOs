import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import type { Schemas } from '@/shared/api'
import { fetchBrandDeliverableCounts, fetchTaskCounts } from '../api/task-counts'
import type { DeliverableStatus } from './deliverable'
import { taskKeys } from './task-keys'

type Role = Schemas['Role']
type BadgeUser = { id: string; role: Role | null; status: Schemas['MeResponse']['status'] } | null

// The tasks that wait for the user: a creator's work sent back with requested
// changes, the deliverables an art director has to review. Others have none.
export function attentionStatus(role: Role | undefined): DeliverableStatus | null {
  if (role === 'creator') return 'needs_changes'
  if (role === 'art_director') return 'needs_review'
  return null
}

// Brands' deliverables no shoot closes yet (docs/adr/0019): what the art
// director still has to plan. 0 for anyone else and while unknown.
export function useNotScheduledCount(user: () => BadgeUser) {
  const asked = computed(() => {
    const me = user()
    return me?.status === 'approved' && me.role === 'art_director' ? me.id : null
  })
  const { data } = useQuery({
    key: () => taskKeys.brandCounts(asked.value ?? ''),
    query: fetchBrandDeliverableCounts,
    enabled: () => asked.value !== null,
    meta: { toast: false },
  })
  return computed(() => (asked.value && data.value ? data.value.not_scheduled : 0))
}

// The number next to My tasks in the menu; 0 while unknown. Asked only for an
// approved team member: anyone else gets 403 from /tasks. An art director's
// count adds the not scheduled brand deliverables to the reviews (docs/adr/0023).
export function useTasksBadge(user: () => BadgeUser) {
  const status = computed(() => {
    const me = user()
    return me?.status === 'approved' ? attentionStatus(me.role ?? undefined) : null
  })
  const { data } = useQuery({
    key: () => taskKeys.counts(user()?.id ?? '', user()?.role ?? ''),
    query: fetchTaskCounts,
    enabled: () => status.value !== null,
    meta: { toast: false },
  })
  const notScheduled = useNotScheduledCount(user)
  return computed(
    () => (status.value && data.value ? data.value[status.value] : 0) + notScheduled.value,
  )
}
