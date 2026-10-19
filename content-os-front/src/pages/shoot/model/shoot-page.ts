import { computed } from 'vue'
import { useSessionStore } from '@/entities/session'
import { shootStatuses, useShoot } from '@/entities/shoot'
import { queryParam, useQueryParams } from '@/shared/lib'
import { toProducts } from './products-tab'
import { coverPhotos, shootCounts, shootFacts, shootPeople } from './shoot'
import { taskFilterOptions, taskRoute, toTasks, type ShootTask } from './tasks-tab'

export const shootTabValues = [
  'overview',
  'products',
  'tasks',
  'needs_review',
  'approved',
  'references',
  'files',
  'team',
  'notes',
] as const
export type ShootTab = (typeof shootTabValues)[number]

// The tab lives in the URL (?tab=tasks), so a link or a reload opens it.
// Overview is the default and leaves the URL clean.
const shootQueryParams = { tab: queryParam.oneOf(shootTabValues, 'overview') }

// The shoot page (Figma "Shoot / Overview", "Products", "Tasks"). One request
// brings everything; search, filters and sort of the tabs run in the browser,
// each tab's in its own *-tab.ts.
export function useShootPage(id: () => string) {
  const { data: shoot, error, isLoading } = useShoot(id)

  const { state: query } = useQueryParams(shootQueryParams)
  const tab = computed<ShootTab>({
    get: () => query.tab,
    set: (value) => (query.tab = value),
  })

  // Only the art director who created the shoot edits it (docs/adr/0008).
  const canEdit = computed(() => shoot.value?.can_edit === true)
  const status = computed(() => (shoot.value ? shootStatuses[shoot.value.status] : null))
  const facts = computed(() => (shoot.value ? shootFacts(shoot.value) : null))

  const products = computed(() => (shoot.value ? toProducts(shoot.value) : []))
  const tasks = computed(() => (shoot.value ? toTasks(shoot.value) : []))
  const people = computed(() => (shoot.value ? shootPeople(shoot.value) : []))
  const counts = computed(() => shootCounts(tasks.value))
  // Deliverables whose content waits for the art director (docs/adr/0009).
  const reviewTasks = computed(() => tasks.value.filter((task) => task.status === 'needs_review'))
  const approvedTasks = computed(() => tasks.value.filter((task) => task.status === 'approved'))
  const covers = computed(() => coverPhotos(products.value, 5))

  const tabs = computed(() => [
    { value: 'overview' as const, label: 'Overview' },
    { value: 'products' as const, label: `Products (${products.value.length})` },
    { value: 'tasks' as const, label: `Tasks (${tasks.value.length})` },
    { value: 'needs_review' as const, label: `Needs review (${reviewTasks.value.length})` },
    { value: 'approved' as const, label: `Approved (${approvedTasks.value.length})` },
    { value: 'references' as const, label: 'References' },
    { value: 'files' as const, label: 'Files' },
    { value: 'team' as const, label: 'Team' },
    { value: 'notes' as const, label: 'Notes' },
  ])

  // Only an art director reviews uploads: the Actions column is theirs.
  const session = useSessionStore()
  const canReview = computed(() => session.me?.role === 'art_director')
  // Opening a task: its review for the shoot's art director, the task for an assignee.
  const viewer = computed(() => ({ reviews: canEdit.value, id: session.me?.id ?? null }))
  const taskLink = (task: ShootTask) => taskRoute(task, viewer.value)

  // The selects of the Tasks, Needs review and Approved tabs.
  const taskOptions = computed(() => taskFilterOptions(products.value, people.value))

  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && shoot.value === undefined)
  const notFound = computed(() => error.value?.status === 404)

  return {
    shoot,
    loading,
    error,
    notFound,
    tab,
    tabs,
    canEdit,
    canReview,
    taskLink,
    status,
    facts,
    products,
    tasks,
    reviewTasks,
    approvedTasks,
    people,
    counts,
    covers,
    taskOptions,
  }
}
