import { computed, ref } from 'vue'
import { progressPercent, type ShootDetails } from '@/entities/shoot'
import { matches, type DeliverableCounts } from './shoot'

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

// The Products tab's search and sort.
export function useProductsTab(products: () => ShootProduct[]) {
  const search = ref('')
  const sort = ref<ProductSort>('order')
  const found = computed(() => findProducts(products(), search.value, sort.value))
  return { search, sort, found }
}
