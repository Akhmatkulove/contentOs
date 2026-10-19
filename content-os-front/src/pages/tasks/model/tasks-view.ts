import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useNotScheduledCount } from '@/entities/deliverable'
import { useSessionStore } from '@/entities/session'
import { badgeLabel, queryParam, useQueryParams, type QueryParams } from '@/shared/lib'

export type TasksView = 'shoot' | 'brand'

const viewParams = {
  // brand: the art director's backlog of brands' deliverables (docs/adr/0019).
  view: queryParam.oneOf(['shoot', 'brand'] as const, 'shoot'),
} satisfies QueryParams

// Which list My tasks shows. Switching is a link to a clean URL: the two lists
// have their own tabs and filters.
export function useTasksView() {
  const session = useSessionStore()
  const { state } = useQueryParams(viewParams)
  const artDirector = computed(() => session.me?.role === 'art_director')
  // Only the art director has a backlog; a creator's link to it shows their tasks.
  const view = computed<TasksView>(() => (artDirector.value ? state.view : 'shoot'))
  // The brand deliverables no shoot closes yet: the art director's to plan (docs/adr/0023).
  const notScheduled = useNotScheduledCount(() => session.me)
  const views = computed<
    { value: TasksView; label: string; to: RouteLocationRaw; badge: string | undefined }[]
  >(() => [
    { value: 'shoot', label: 'Shoot tasks', to: { name: 'tasks' }, badge: undefined },
    {
      value: 'brand',
      label: 'Brand deliverables',
      to: { name: 'tasks', query: { view: 'brand' } },
      badge: badgeLabel(notScheduled.value),
    },
  ])
  return { artDirector, view, views }
}
