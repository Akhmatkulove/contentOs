import { http, type Schemas } from '@/shared/api'

export type TaskCounts = Schemas['TaskCounts']

// The sizes of the My tasks tabs, without the tasks themselves (one row comes
// along: the list has no smaller page).
export async function fetchTaskCounts(): Promise<TaskCounts> {
  return (await http.get<Schemas['TaskList']>('/tasks', { params: { per_page: 1 } })).data.counts
}

export type BrandDeliverableCounts = Schemas['BrandDeliverableCounts']

// The sizes of the art director's backlog tabs (docs/adr/0019), the same way.
export async function fetchBrandDeliverableCounts(): Promise<BrandDeliverableCounts> {
  const { data } = await http.get<Schemas['BrandDeliverableList']>('/tasks/brand-deliverables', {
    params: { per_page: 1 },
  })
  return data.counts
}
