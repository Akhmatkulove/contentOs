import { computed, ref } from 'vue'
import { deliverableStatusOptions } from '@/entities/deliverable'
import { useSessionStore } from '@/entities/session'
import { shootStatuses, useShoot } from '@/entities/shoot'
import { queryParam, useQueryParams } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'
import {
  ALL,
  coverPhotos,
  defaultTaskFilters,
  findProducts,
  findTasks,
  shootCounts,
  shootFacts,
  shootPeople,
  toProducts,
  toTasks,
  type ProductSort,
  type TaskFilters,
} from './shoot'

export const shootTabValues = ['overview', 'products', 'tasks', 'needs_review'] as const
export type ShootTab = (typeof shootTabValues)[number]

// The tab lives in the URL (?tab=tasks), so a link or a reload opens it.
// Overview is the default and leaves the URL clean.
const shootQueryParams = { tab: queryParam.oneOf(shootTabValues, 'overview') }

// The shoot page (Figma "Shoot / Overview", "Products", "Tasks"). One request
// brings everything; search, filters and sort of the tabs run in the browser.
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
  const covers = computed(() => coverPhotos(products.value, 5))

  const tabs = computed(() => [
    { value: 'overview' as const, label: 'Overview' },
    { value: 'products' as const, label: `Products (${products.value.length})` },
    { value: 'tasks' as const, label: `Tasks (${tasks.value.length})` },
    { value: 'needs_review' as const, label: `Needs review (${reviewTasks.value.length})` },
  ])

  // Only an art director reviews uploads: the Actions column is theirs.
  const session = useSessionStore()
  const canReview = computed(() => session.me?.role === 'art_director')

  const productSearch = ref('')
  const productSort = ref<ProductSort>('order')
  const foundProducts = computed(() =>
    findProducts(products.value, productSearch.value, productSort.value),
  )

  const taskFilters = ref<TaskFilters>({ ...defaultTaskFilters })
  const foundTasks = computed(() => findTasks(tasks.value, taskFilters.value))

  // The Needs review tab: the same search and filters, its own state.
  const reviewFilters = ref<TaskFilters>({ ...defaultTaskFilters })
  const foundReviewTasks = computed(() => findTasks(reviewTasks.value, reviewFilters.value))
  const taskOptions = computed(() => ({
    products: [
      { value: ALL, label: 'All products' },
      ...products.value.map((product) => ({ value: product.id, label: product.name })),
    ] satisfies SelectOption[],
    assignees: [
      { value: ALL, label: 'All assignees' },
      ...people.value
        .filter((person) => person.role !== 'Art Director')
        .map(({ member }) => ({ value: member.id, label: member.name || 'Unnamed' })),
    ] satisfies SelectOption[],
    statuses: [
      { value: ALL, label: 'All statuses' },
      ...deliverableStatusOptions,
    ] satisfies SelectOption[],
  }))

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
    status,
    facts,
    products,
    tasks,
    people,
    counts,
    covers,
    productSearch,
    productSort,
    foundProducts,
    taskFilters,
    foundTasks,
    taskOptions,
    reviewTasks,
    reviewFilters,
    foundReviewTasks,
    canReview,
  }
}
