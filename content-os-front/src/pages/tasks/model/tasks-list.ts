import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { useSessionStore } from '@/entities/session'
import { queryParam, useQueryParams, type QueryParams } from '@/shared/lib'
import { fetchTaskFilters, fetchTasks, type TaskSort } from '../api/tasks'
import {
  defaultSort,
  roleTabs,
  taskSortOptions,
  taskTabs,
  toTask,
  type TaskRole,
  type TaskTabValue,
} from './task'

export const TASKS_PER_PAGE = 20

// Reka Select can't hold an empty value, so "All …" is this sentinel.
const ALL = 'all'

const tabValues = ['all', 'needs_review', 'needs_changes', 'to_shoot', 'approved'] as const
const sortValues = ['', ...taskSortOptions.map((option) => option.value)] as const

// The list's state in the URL: /tasks?tab=needs_review&shoot=…&sort=due_date&page=2.
// '' sort is the role's default (Priority or Due date); '' ids are "All".
const taskQueryParams = {
  search: queryParam.text(),
  tab: queryParam.oneOf(tabValues, 'all'),
  shoot: queryParam.text(),
  product: queryParam.text(),
  assignee: queryParam.text(),
  sort: queryParam.oneOf(sortValues, ''),
  page: queryParam.page(),
} satisfies QueryParams

type IdFilter = 'shoot' | 'product' | 'assignee'

// My tasks (docs/adr/0011): the art director's shoot deliverables, or the ones
// a creator is assigned to. Search, filters, tab and page live in the URL; the
// server searches, filters and pages.
export function useTasksList() {
  const { state: query, update } = useQueryParams(taskQueryParams, { page: 'page' })
  const session = useSessionStore()
  // The route lets in only the team: anyone but the art director is a creator here.
  const role = computed<TaskRole>(() =>
    session.me?.role === 'art_director' ? 'art_director' : 'creator',
  )

  const search = computed({
    get: () => query.search,
    set: (value) => (query.search = value),
  })
  const page = computed({
    get: () => query.page,
    set: (value) => (query.page = value),
  })

  // A tab the role doesn't have (a link from the other role) reads as All.
  const tab = computed({
    get: (): TaskTabValue => (roleTabs[role.value].includes(query.tab) ? query.tab : 'all'),
    set: (value: string) => update({ tab: value as TaskTabValue }),
  })

  const sort = computed({
    get: (): TaskSort => query.sort || defaultSort[role.value],
    set: (value: string | undefined) =>
      update({ sort: !value || value === defaultSort[role.value] ? '' : (value as TaskSort) }),
  })

  // VSelect shows the "All …" option for ''.
  const idFilter = (key: IdFilter) =>
    computed({
      get: () => query[key] || ALL,
      set: (value: string | undefined) => update({ [key]: !value || value === ALL ? '' : value }),
    })

  const { data, isLoading } = useQuery({
    key: () => ['tasks', role.value, { ...query }],
    query: () =>
      fetchTasks({
        search: query.search,
        status: tab.value === 'all' ? undefined : tab.value,
        shootId: query.shoot || undefined,
        productId: query.product || undefined,
        assigneeId: query.assignee || undefined,
        sort: sort.value,
        page: query.page,
        perPage: TASKS_PER_PAGE,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  const { data: filterData } = useQuery({ key: ['tasks', 'filters'], query: fetchTaskFilters })
  const options = (items: { id: string; name: string | null }[] | undefined, all: string) => [
    { value: ALL, label: all },
    ...(items ?? []).map((item) => ({ value: item.id, label: item.name || 'Unnamed' })),
  ]
  const shootOptions = computed(() => options(filterData.value?.shoots, 'All shoots'))
  const productOptions = computed(() => options(filterData.value?.products, 'All'))
  const assigneeOptions = computed(() => options(filterData.value?.assignees, 'All assignees'))

  const today = new Date()
  const tasks = computed(() => (data.value?.items ?? []).map((item) => toTask(item, today)))
  const total = computed(() => data.value?.total ?? 0)
  const tabs = computed(() => taskTabs(role.value, data.value?.counts))
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)

  return {
    role,
    search,
    tab,
    tabs,
    sort,
    shoot: idFilter('shoot'),
    product: idFilter('product'),
    assignee: idFilter('assignee'),
    shootOptions,
    productOptions,
    assigneeOptions,
    tasks,
    total,
    loading,
    page,
  }
}
