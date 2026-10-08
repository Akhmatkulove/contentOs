import { formatDueDate, type DeliverableStatus } from '@/entities/deliverable'
import { toReference, type ReferenceKind } from '@/entities/reference'
import { durationLabel, progressPercent, type ShootDetails } from '@/entities/shoot'
import type { Schemas } from '@/shared/api'

export type TeamMember = Schemas['TeamMember']
export type DeliverableCounts = Schemas['DeliverableCounts']

// A shoot's product as its cards show it.
export interface ShootProduct {
  id: string
  name: string
  // "Autumn Drop · Abayas"; whatever is missing is left out.
  subtitle: string
  // Just the collection, as "Products in this shoot" shows it.
  collection: string
  photoUrl: string | null
  counts: DeliverableCounts
  // Approved out of the product's deliverables in this shoot, 0–100.
  percent: number
}

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

export type ShootRoleLabel = 'Art Director' | 'Creator' | 'Mobilographer'

export interface ShootPerson {
  member: TeamMember
  role: ShootRoleLabel
}

export function toProducts(shoot: ShootDetails): ShootProduct[] {
  return shoot.products.map((product) => ({
    id: product.id,
    name: product.name,
    subtitle: [product.collection, product.category].filter(Boolean).join(' · '),
    collection: product.collection ?? '',
    photoUrl: product.photo?.url ?? null,
    counts: product.deliverables,
    percent: progressPercent(product.deliverables.approved, product.deliverables.total),
  }))
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

// The art director first, then creators and the mobilographer.
export function shootPeople(shoot: ShootDetails): ShootPerson[] {
  return [
    { member: shoot.art_director, role: 'Art Director' },
    ...shoot.creators.map((member) => ({ member, role: 'Creator' as const })),
    ...(shoot.mobilographer
      ? [{ member: shoot.mobilographer, role: 'Mobilographer' as const }]
      : []),
  ]
}

// Deliverables of the whole shoot by status.
export function shootCounts(tasks: ShootTask[]): DeliverableCounts {
  const counts = { total: tasks.length, to_shoot: 0, in_progress: 0, needs_changes: 0, approved: 0 }
  for (const task of tasks) counts[task.status] += 1
  return counts
}

// "Shoot details": Date, Start time, Location, Est. duration.
export function shootFacts(shoot: ShootDetails) {
  return {
    date: formatDueDate(shoot.date),
    // "10:00:00" → "10:00".
    startTime: shoot.start_time.slice(0, 5),
    location: shoot.location ?? '',
    duration: durationLabel(shoot.duration_minutes),
  }
}

// Figma "Card / Shoot covers": up to `shown` product photos, then "+N".
export function coverPhotos(products: ShootProduct[], shown: number) {
  const photos = products.flatMap((product) =>
    product.photoUrl ? [{ id: product.id, name: product.name, url: product.photoUrl }] : [],
  )
  return { photos: photos.slice(0, shown), more: Math.max(0, photos.length - shown) }
}

const matches = (text: string, search: string) =>
  text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())

export const productSortOptions = [
  { value: 'order', label: 'Shoot order' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
  { value: 'progress', label: 'Most progress' },
] as const

export type ProductSort = (typeof productSortOptions)[number]['value']

// The Products tab: search by name, collection and category, then sort.
export function findProducts(
  products: ShootProduct[],
  search: string,
  sort: ProductSort,
): ShootProduct[] {
  const found = products.filter((product) => matches(`${product.name} ${product.subtitle}`, search))
  const byName = (a: ShootProduct, b: ShootProduct) => a.name.localeCompare(b.name)
  if (sort === 'name_asc') return found.sort(byName)
  if (sort === 'name_desc') return found.sort((a, b) => byName(b, a))
  if (sort === 'progress') return found.sort((a, b) => b.percent - a.percent)
  return found
}

// Reka Select can't hold an empty value, so "All …" is this sentinel.
export const ALL = 'all'

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

// The Tasks tab: search by task and product name, filter, then sort. Tasks
// without a due date go last when sorted by it.
export function findTasks(tasks: ShootTask[], filters: TaskFilters): ShootTask[] {
  const found = tasks.filter(
    (task) =>
      matches(`${task.name} ${task.product.name}`, filters.search) &&
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
