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
  const counts: DeliverableCounts = {
    total: tasks.length,
    to_shoot: 0,
    in_progress: 0,
    needs_review: 0,
    needs_changes: 0,
    approved: 0,
  }
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

export type ShootReference = ShootDetails['references'][number]

export const referenceTypeOptions = [
  { value: ALL, label: 'All types' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'moodboard', label: 'Moodboard' },
] as const

export const referenceSortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_asc', label: 'Name: A–Z' },
  { value: 'title_desc', label: 'Name: Z–A' },
] as const

export interface ReferenceFilters {
  search: string
  productId: string
  type: (typeof referenceTypeOptions)[number]['value']
  sort: (typeof referenceSortOptions)[number]['value']
}

export const defaultReferenceFilters: ReferenceFilters = {
  search: '',
  productId: ALL,
  type: ALL,
  sort: 'newest',
}

// The References tab: search by title, notes and tags, filter by product and
// type, then sort. Untitled references go last when sorted by name.
export function findReferences(
  references: ShootReference[],
  filters: ReferenceFilters,
): ShootReference[] {
  const found = references.filter(
    (reference) =>
      matches(
        [reference.title ?? '', reference.notes ?? '', ...reference.tags].join(' '),
        filters.search,
      ) &&
      (filters.productId === ALL || reference.product_id === filters.productId) &&
      (filters.type === ALL || reference.type === filters.type),
  )
  const byTitle = (a: ShootReference, b: ShootReference) =>
    (a.title ?? '￿').localeCompare(b.title ?? '￿')
  if (filters.sort === 'title_asc') return found.sort(byTitle)
  if (filters.sort === 'title_desc') return found.sort((a, b) => byTitle(b, a))
  if (filters.sort === 'oldest')
    return found.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return found.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// How many of the shoot's deliverables follow each reference (Figma "Used in 2
// deliverables"); references no deliverable uses are left out.
export function referenceUsage(shoot: ShootDetails): Map<string, number> {
  const usage = new Map<string, number>()
  for (const deliverable of shoot.deliverables) {
    for (const id of deliverable.reference_ids) usage.set(id, (usage.get(id) ?? 0) + 1)
  }
  return usage
}

// The line under a reference card on the shoot's References tab.
export function usageLabel(count: number): string {
  if (!count) return 'Assigned to this shoot'
  return `Used in ${count} ${count === 1 ? 'deliverable' : 'deliverables'}`
}

// What each role on a shoot does: Figma "Role responsibilities" and the lists
// on the member cards. Static: the shoot has no per-person responsibilities yet.
export const roleResponsibilities: Record<ShootRoleLabel, { card: string[]; member: string[] }> = {
  'Art Director': {
    card: [
      'Set creative vision and style direction',
      'Approve shot list, content and final edits',
      'Ensure brand consistency across outputs',
    ],
    member: ['Creative direction', 'Shot list & moodboard approval', 'Final review and sign-off'],
  },
  Mobilographer: {
    card: [
      'Capture high-quality photo and video',
      'Manage and maintain camera equipment',
      'Organize, label and back up all files',
    ],
    member: [
      'Capture photo & video content',
      'Manage camera equipment',
      'Organize and back up files',
    ],
  },
  Creator: {
    card: [
      'Model for product and lifestyle shots',
      'Create engaging short-form video content',
      'Collaborate on team creative ideas',
    ],
    member: [
      'Model for product shots',
      'Create short-form video content',
      'Collaborate on creative ideas',
    ],
  },
}

export interface TeamCard extends ShootPerson {
  // Deliverables the member is an assignee of; the art director's line counts
  // every deliverable of the shoot instead (they oversee all of them).
  tasks: number
  responsibilities: string[]
}

export function teamCards(shoot: ShootDetails): TeamCard[] {
  return shootPeople(shoot).map((person) => ({
    ...person,
    tasks:
      person.role === 'Art Director'
        ? shoot.deliverables.length
        : shoot.deliverables.filter((d) => d.assignees.some((a) => a.id === person.member.id))
            .length,
    responsibilities: roleResponsibilities[person.role].member,
  }))
}

// "5 tasks assigned"; the art director's line reads "Oversees 5 deliverables".
export function tasksLabel(card: TeamCard): string {
  if (card.role === 'Art Director') {
    return `Oversees ${card.tasks} ${card.tasks === 1 ? 'deliverable' : 'deliverables'}`
  }
  return `${card.tasks} ${card.tasks === 1 ? 'task' : 'tasks'} assigned`
}

// Figma "Team summary".
export function teamSummary(shoot: ShootDetails) {
  return {
    members: shootPeople(shoot).length,
    creators: shoot.creators.length,
    // Deliverables someone is assigned to.
    tasks: shoot.deliverables.filter((deliverable) => deliverable.assignees.length).length,
    mobilographers: shoot.mobilographer ? 1 : 0,
  }
}

export const teamRoleOptions = [
  { value: ALL, label: 'All roles' },
  { value: 'Art Director', label: 'Art Director' },
  { value: 'Creator', label: 'Creator' },
  { value: 'Mobilographer', label: 'Mobilographer' },
] as const

// The Team tab: search by name, role and responsibility, filter by role.
export function findTeam(cards: TeamCard[], search: string, role: string): TeamCard[] {
  return cards.filter(
    (card) =>
      (role === ALL || card.role === role) &&
      matches([card.member.name ?? '', card.role, ...card.responsibilities].join(' '), search),
  )
}
