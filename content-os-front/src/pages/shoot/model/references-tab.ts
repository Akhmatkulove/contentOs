import { computed, ref } from 'vue'
import { toReference } from '@/entities/reference'
import type { ShootDetails } from '@/entities/shoot'
import type { SelectOption } from '@/shared/ui/select'
import type { ShootProduct } from './products-tab'
import { ALL, matches } from './shoot'

type ShootReference = ShootDetails['references'][number]

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

// The Product select: the shoot's products its references belong to.
export function referenceProductOptions(
  references: ShootReference[],
  products: ShootProduct[],
): SelectOption[] {
  const used = new Set(references.map((item) => item.product_id))
  return [
    { value: ALL, label: 'All products' },
    ...products
      .filter((product) => used.has(product.id))
      .map((product) => ({ value: product.id, label: product.name })),
  ]
}

// The References tab: the shoot's references searched, filtered and sorted,
// and how many deliverables follow each.
export function useReferencesTab(
  shoot: () => ShootDetails | undefined,
  products: () => ShootProduct[],
) {
  const filters = ref<ReferenceFilters>({ ...defaultReferenceFilters })
  const references = () => shoot()?.references ?? []
  const found = computed(() => findReferences(references(), filters.value).map(toReference))
  const uses = computed(() => {
    const value = shoot()
    return value ? referenceUsage(value) : new Map<string, number>()
  })
  const productOptions = computed(() => referenceProductOptions(references(), products()))
  return { filters, found, uses, productOptions }
}
