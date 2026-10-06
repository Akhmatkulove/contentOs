import type { Schemas } from '@/shared/api'
import type { SelectOption } from '@/shared/ui/select'

export type ProductStatus = Schemas['ProductStatus']

// How each status looks in VStatus. The Figma workflow statuses (Approved, In
// progress, To shoot, Needs changes) belong to deliverables.
export const productStatuses = {
  active: { label: 'Active', tone: 'success' },
  archived: { label: 'Archived', tone: 'warning' },
} as const satisfies Record<ProductStatus, { label: string; tone: string }>

export const productStatusOptions = (Object.keys(productStatuses) as ProductStatus[]).map(
  (value) => ({ value, label: productStatuses[value].label }),
) satisfies SelectOption[]

// Cache key of one product: the product page and the edit form share the entry.
// Not under ['products'], so refreshing the list leaves the open product alone.
export const productKey = (id: string) => ['product', id] as const
