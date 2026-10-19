import { useQuery } from '@pinia/colada'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { taskKeys } from '@/entities/deliverable'
import { toReference, type Reference } from '@/entities/reference'
import type { Schemas } from '@/shared/api'
import { fetchTaskReferences, type TaskDetails } from '../api/task'

type ReferenceResponse = Schemas['ReferenceResponse']

// The cards of the references block: the task's first ones until the rest is
// loaded, then all of them. `more` is the "+N" tile; none once all are there.
export function referenceCards(
  task: Pick<TaskDetails, 'references' | 'references_total'>,
  all: ReferenceResponse[] | undefined,
): { references: Reference[]; more: number } {
  if (all) return { references: all.map(toReference), more: 0 }
  return {
    references: task.references.map(toReference),
    more: Math.max(0, task.references_total - task.references.length),
  }
}

// Figma "Card / Shoot covers" of the task page: the first references come with
// the task; "+N" loads the rest (GET /api/tasks/{id}/references).
export function useTaskReferences(
  id: MaybeRefOrGetter<string>,
  task: MaybeRefOrGetter<TaskDetails | undefined>,
) {
  // Asked for the rest; another task starts from its first ones again.
  const expanded = ref(false)
  watch(
    () => toValue(id),
    () => (expanded.value = false),
  )

  const { data, isLoading, error, refetch } = useQuery({
    key: () => taskKeys.references(toValue(id)),
    query: () => fetchTaskReferences(toValue(id)),
    enabled: expanded,
  })

  const cards = computed(() => {
    const current = toValue(task)
    if (!current) return { references: [], more: 0 }
    return referenceCards(current, expanded.value ? data.value : undefined)
  })
  const loadingMore = computed(() => expanded.value && isLoading.value)

  // A failed load leaves the tile in place; a click tries again.
  function loadMore() {
    if (loadingMore.value) return
    if (expanded.value && error.value) refetch()
    else expanded.value = true
  }

  return {
    references: computed(() => cards.value.references),
    more: computed(() => cards.value.more),
    loadingMore,
    loadMore,
  }
}
