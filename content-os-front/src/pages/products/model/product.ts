import type { ProductStatus } from '@/entities/product'
import type { Schemas } from '@/shared/api'

// What a product card shows.
export interface Product {
  id: string
  name: string
  collection: string | null
  sku: string | null
  photoUrl: string | null
  status: ProductStatus
  // Shoots are working on it: Archive is off (docs/adr/0022).
  inWork: boolean
  // The user's orders of the product and how many are sent to the brand (docs/adr/0027).
  deliverables: { done: number; total: number }
}

export function toProduct(item: Schemas['ProductListItem']): Product {
  return {
    id: item.id,
    name: item.name,
    collection: item.collection,
    sku: item.sku,
    photoUrl: item.photo?.url ?? null,
    status: item.status,
    inWork: item.in_work,
    deliverables: { done: item.approved, total: item.deliverables },
  }
}

// "Summer 26 · LS-01"; whatever is missing is left out.
export function productSubtitle({ collection, sku }: Pick<Product, 'collection' | 'sku'>): string {
  return [collection, sku].filter(Boolean).join(' · ')
}

// "1 product", "3 products".
export function productsLabel(count: number): string {
  return `${count} ${count === 1 ? 'product' : 'products'}`
}

// Share of finished deliverables, 0–100. No deliverables yet counts as 0%.
export function deliveryPercent({ done, total }: { done: number; total: number }): number {
  if (total <= 0) return 0
  return Math.round((Math.min(done, total) / total) * 100)
}
