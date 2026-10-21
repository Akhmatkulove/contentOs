import { http, type Schemas } from '@/shared/api'

export type ShootList = Schemas['ShootList']
export type TaskList = Schemas['TaskList']

// The art director's newest shoots, and how many of all their shoots are in
// each status (docs/adr/0007).
export async function fetchRecentShoots(count: number): Promise<ShootList> {
  const params = { sort: 'newest', per_page: count }
  return (await http.get<ShootList>('/shoots', { params })).data
}

// The first tasks of My tasks in its default order: what waits for the user first
// (docs/adr/0011).
export async function fetchTopTasks(count: number): Promise<TaskList> {
  const params = { sort: 'priority', per_page: count }
  return (await http.get<TaskList>('/tasks', { params })).data
}

export type ActivityList = Schemas['ActivityList']
export type ActivityItem = Schemas['ActivityItem']

// The newest events of the user's shoots (docs/adr/0027).
export async function fetchActivity(limit: number): Promise<ActivityList> {
  return (await http.get<ActivityList>('/activity', { params: { limit } })).data
}

// How many deliverables were sent to the brand since then: only the total is
// needed, so one row is the smallest page (docs/adr/0027).
export async function fetchSentCount(since: Date): Promise<number> {
  const params = { status: 'approved', sent_since: since.toISOString(), per_page: 1 }
  return (await http.get<TaskList>('/tasks', { params })).data.total
}
