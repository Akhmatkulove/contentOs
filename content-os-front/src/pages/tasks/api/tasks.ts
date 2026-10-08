import { http, type Schemas } from '@/shared/api'

export type TaskList = Schemas['TaskList']
export type TaskItem = Schemas['TaskItem']
export type TaskCounts = Schemas['TaskCounts']
export type TaskSort = Schemas['TaskSort']
export type TaskFilterOptions = Schemas['TaskFilters']

export interface TasksQuery {
  search?: string
  status?: Schemas['DeliverableStatus']
  shootId?: string
  productId?: string
  assigneeId?: string
  sort?: TaskSort
  page?: number
  perPage?: number
}

// The art director's shoot deliverables, or the ones a creator is assigned to
// (docs/adr/0011).
export async function fetchTasks(query: TasksQuery): Promise<TaskList> {
  const params = {
    search: query.search || undefined,
    status: query.status,
    shoot_id: query.shootId,
    product_id: query.productId,
    assignee_id: query.assigneeId,
    sort: query.sort,
    page: query.page,
    per_page: query.perPage,
  }
  return (await http.get<TaskList>('/tasks', { params })).data
}

// Shoots, products and assignees found in the user's tasks.
export async function fetchTaskFilters(): Promise<TaskFilterOptions> {
  return (await http.get<TaskFilterOptions>('/tasks/filters')).data
}
