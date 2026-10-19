import { http, type Schemas } from '@/shared/api'

export type TaskCounts = Schemas['TaskCounts']

// The sizes of the My tasks tabs, without the tasks themselves (one row comes
// along: the list has no smaller page).
export async function fetchTaskCounts(): Promise<TaskCounts> {
  return (await http.get<Schemas['TaskList']>('/tasks', { params: { per_page: 1 } })).data.counts
}
