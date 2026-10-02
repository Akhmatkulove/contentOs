// TODO(api): replace with the product type from `Schemas` once the backend
// has a products endpoint.
export type ProductStatus = 'approved' | 'in_progress' | 'to_shoot' | 'needs_changes'

export interface Product {
  id: string
  name: string
  collection: string
  sku: string
  photoUrl: string | null
  status: ProductStatus
  deliverables: { done: number; total: number }
}

// How each status looks in VStatus.
export const productStatuses = {
  approved: { label: 'Approved', tone: 'success' },
  in_progress: { label: 'In progress', tone: 'info' },
  to_shoot: { label: 'To shoot', tone: 'info' },
  needs_changes: { label: 'Needs changes', tone: 'danger' },
} as const satisfies Record<ProductStatus, { label: string; tone: string }>

// Share of finished deliverables, 0–100. No deliverables yet counts as 0%.
export function deliveryPercent({ done, total }: Product['deliverables']): number {
  if (total <= 0) return 0
  return Math.round((Math.min(done, total) / total) * 100)
}
