import type { RouteLocationRaw } from 'vue-router'
import {
  deliverableStatusChip,
  dueHint,
  formatDueDate,
  type DeliverableType,
  type DueHint,
} from '@/entities/deliverable'
import type { Schemas } from '@/shared/api'
import type {
  BrandDeliverableCounts,
  BrandDeliverableItem,
  BrandDeliverableStatus,
} from '../api/brand-deliverables'

// A row of the art director's backlog: a brand's deliverable assigned to them
// (docs/adr/0019).
export interface BrandDeliverable {
  id: string
  name: string
  type: DeliverableType
  brief: string
  // "Sep 18, 2024"; empty without a due date.
  dueDate: string
  due: DueHint | null
  // "Not scheduled" while no shoot closes it (docs/adr/0018).
  status: ReturnType<typeof deliverableStatusChip>
  // The art director's shoots that close it.
  shoots: { id: string; name: string }[]
  product: { id: string; name: string; sku: string; photoUrl: string | null }
  brand: Schemas['TeamMember']
  action: { kind: 'plan' | 'view'; label: string; to: RouteLocationRaw }
}

// Not scheduled: Plan shoot opens Create new shoot with the product ticked and
// this deliverable ready in Add deliverable. Otherwise View opens its first
// shoot, or the product when only another art director's shoot closes it.
function brandDeliverableAction(item: BrandDeliverableItem): BrandDeliverable['action'] {
  if (item.shoots_total === 0) {
    return {
      kind: 'plan',
      label: 'Plan shoot',
      to: { name: 'shoot-create', query: { product: item.product.id, deliverable: item.id } },
    }
  }
  const [first] = item.shoots
  return {
    kind: 'view',
    label: 'View',
    to: first
      ? { name: 'shoot', params: { id: first.id } }
      : { name: 'product', params: { id: item.product.id } },
  }
}

export function toBrandDeliverable(item: BrandDeliverableItem, today: Date): BrandDeliverable {
  const due = item.due_date ?? ''
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    brief: item.brief ?? '',
    dueDate: formatDueDate(due),
    due: due ? dueHint(due, today) : null,
    status: deliverableStatusChip({ status: item.status, shoots: item.shoots_total }),
    shoots: item.shoots.map((shoot) => ({ id: shoot.id, name: shoot.name })),
    product: {
      id: item.product.id,
      name: item.product.name,
      sku: item.product.sku ?? '',
      photoUrl: item.product.photo?.url ?? null,
    },
    brand: item.brand,
    action: brandDeliverableAction(item),
  }
}

export type BrandDeliverableTabValue = 'all' | BrandDeliverableStatus

export const brandDeliverableTabValues = [
  'all',
  'not_scheduled',
  'to_shoot',
  'in_progress',
  'needs_review',
  'needs_changes',
  'approved',
] as const satisfies readonly BrandDeliverableTabValue[]

const tabLabels: Record<BrandDeliverableTabValue, string> = {
  all: 'All',
  not_scheduled: 'Not scheduled',
  // Planned in a shoot, nothing shot yet.
  to_shoot: 'To shoot',
  in_progress: 'In progress',
  needs_review: 'Needs review',
  needs_changes: 'Needs changes',
  approved: 'Approved',
}

// Counts follow the search and filters, not the tab.
export function brandDeliverableTabs(counts: BrandDeliverableCounts | undefined) {
  return brandDeliverableTabValues.map((value) => ({
    value,
    label: tabLabels[value],
    count: counts?.[value] ?? 0,
  }))
}

// "Showing 8 of 14 deliverables".
export function brandDeliverablesShowing(shown: number, total: number): string {
  return `Showing ${shown} of ${total} ${total === 1 ? 'deliverable' : 'deliverables'}`
}
