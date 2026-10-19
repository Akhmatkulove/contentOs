import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import type { Schemas } from '@/shared/api'
import { fetchTaskCounts } from '../api/task-counts'
import type { DeliverableStatus } from './deliverable'
import { taskKeys } from './task-keys'

type Role = Schemas['Role']

// The tasks that wait for the user: a creator's work sent back with requested
// changes, the deliverables an art director has to review. Others have none.
export function attentionStatus(role: Role | undefined): DeliverableStatus | null {
  if (role === 'creator') return 'needs_changes'
  if (role === 'art_director') return 'needs_review'
  return null
}

// The number next to My tasks in the menu; 0 while unknown. Asked only for an
// approved team member: anyone else gets 403 from /tasks.
export function useTasksBadge(
  user: () => { id: string; role: Role | null; status: Schemas['MeResponse']['status'] } | null,
) {
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
  return computed(() => (status.value && data.value ? data.value[status.value] : 0))
}
