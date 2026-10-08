import { computed, ref } from 'vue'
import { deliverableStatusOptions, type DeliverableStatus } from '@/entities/deliverable'
import { toReference, type ReferenceKind } from '@/entities/reference'
import type { ShootDetails } from '@/entities/shoot'
import type { SelectOption } from '@/shared/ui/select'
import type { ShootProduct } from './products-tab'
import { ALL, matches, type ShootPerson, type TeamMember } from './shoot'

export interface TaskReference {
  id: string
  title: string
  kind: ReferenceKind
  previewUrl: string | null
}

// A deliverable of the shoot as the Tasks tab shows it: one task per
// deliverable, for its assignees (their My tasks will list the same).
export interface ShootTask {
  id: string
  // Its number in the shoot, from 1, as added.
  number: number
  name: string
  product: { id: string; name: string; photoUrl: string | null }
  references: TaskReference[]
  assignees: TeamMember[]
  // ISO date, YYYY-MM-DD; empty when not set.
  dueDate: string
  status: DeliverableStatus
}

export function toTasks(shoot: ShootDetails): ShootTask[] {
  const products = new Map(shoot.products.map((product) => [product.id, product]))
  const references = new Map(
    shoot.references.map((reference) => {
      const card = toReference(reference)
      return [
        reference.id,
        { id: card.id, title: card.title, kind: card.kind, previewUrl: card.previewUrl },
      ]
    }),
  )
  return shoot.deliverables.map((deliverable, index) => {
    const product = products.get(deliverable.product_id)
    return {
      id: deliverable.id,
      number: index + 1,
      name: deliverable.name,
      product: {
        id: deliverable.product_id,
        name: product?.name ?? '',
        photoUrl: product?.photo?.url ?? null,
      },
      references: deliverable.reference_ids.flatMap((id) => references.get(id) ?? []),
      assignees: deliverable.assignees,
      dueDate: deliverable.due_date ?? '',
      status: deliverable.status,
    }
  })
}

export const taskSortOptions = [
  { value: 'order', label: 'Shoot order' },
  { value: 'due_soon', label: 'Due date: soonest' },
  { value: 'name_asc', label: 'Name: A–Z' },
] as const

export type TaskSort = (typeof taskSortOptions)[number]['value']

export interface TaskFilters {
  search: string
  productId: string
  assigneeId: string
  status: typeof ALL | DeliverableStatus
  sort: TaskSort
}

export const defaultTaskFilters: TaskFilters = {
  search: '',
  productId: ALL,
  assigneeId: ALL,
  status: ALL,
  sort: 'order',
}

// The Tasks and Needs review tabs: search by task, product and assignee name,
// filter, then sort. Tasks
// without a due date go last when sorted by it.
export function findTasks(tasks: ShootTask[], filters: TaskFilters): ShootTask[] {
  const found = tasks.filter(
    (task) =>
      matches(
        [task.name, task.product.name, ...task.assignees.map((member) => member.name ?? '')].join(
          ' ',
        ),
        filters.search,
      ) &&
      (filters.productId === ALL || task.product.id === filters.productId) &&
      (filters.assigneeId === ALL ||
        task.assignees.some((member) => member.id === filters.assigneeId)) &&
      (filters.status === ALL || task.status === filters.status),
  )
  if (filters.sort === 'name_asc') return found.sort((a, b) => a.name.localeCompare(b.name))
  if (filters.sort === 'due_soon') {
    return found.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
  }
  return found
}

// "Amina", "Amina +2": the first assignee and how many more.
export function assigneesLabel(members: TeamMember[]): string {
  const [first, ...rest] = members
  if (!first) return ''
  const name = first.name || 'Unnamed'
  return rest.length ? `${name} +${rest.length}` : name
}

// The selects of the Tasks, Needs review and Approved tabs: the shoot's
// products, its assignees (the art director isn't one) and the statuses.
export function taskFilterOptions(products: ShootProduct[], people: ShootPerson[]) {
  return {
    products: [
      { value: ALL, label: 'All products' },
      ...products.map((product) => ({ value: product.id, label: product.name })),
    ] satisfies SelectOption[],
    assignees: [
      { value: ALL, label: 'All assignees' },
      ...people
        .filter((person) => person.role !== 'Art Director')
        .map(({ member }) => ({ value: member.id, label: member.name || 'Unnamed' })),
    ] satisfies SelectOption[],
    statuses: [
      { value: ALL, label: 'All statuses' },
      ...deliverableStatusOptions,
    ] satisfies SelectOption[],
  }
}

// The search and filters of one task tab; each tab keeps its own.
export function useTaskList(tasks: () => ShootTask[]) {
  const filters = ref<TaskFilters>({ ...defaultTaskFilters })
  const found = computed(() => findTasks(tasks(), filters.value))
  return { filters, found }
}
