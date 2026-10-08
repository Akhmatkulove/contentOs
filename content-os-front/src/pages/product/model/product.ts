import type { Assignee, Deliverable, DeliverableStatus } from '@/entities/deliverable'
import type { ProductDetails } from '@/entities/product'
import type { Schemas } from '@/shared/api'

type ReferenceResponse = Schemas['ReferenceResponse']

// "Autumn 26 · Abayas · SKU: BA-042"; whatever is missing is left out.
export function productMeta(product: ProductDetails): string[] {
  return [product.collection, product.category, product.sku && `SKU: ${product.sku}`].filter(
    (part): part is string => !!part,
  )
}

// Collection, Category and SKU under About; only the filled ones.
export function productFacts(product: ProductDetails): { label: string; value: string }[] {
  const facts = [
    { label: 'Collection', value: product.collection },
    { label: 'Category', value: product.category },
    { label: 'SKU', value: product.sku },
  ]
  return facts.filter((fact): fact is { label: string; value: string } => !!fact.value)
}

export interface DeliveryProgress {
  done: number
  total: number
  // 0–100; nothing planned yet counts as 0.
  percent: number
  counts: Record<DeliverableStatus, number>
}

// Approved deliverables count as done (Figma "Card / Progress").
export function deliveryProgress(deliverables: Deliverable[]): DeliveryProgress {
  const counts: Record<DeliverableStatus, number> = {
    approved: 0,
    needs_changes: 0,
    in_progress: 0,
    needs_review: 0,
    to_shoot: 0,
  }
  for (const deliverable of deliverables) counts[deliverable.status] += 1
  const total = deliverables.length
  const done = counts.approved
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0, counts }
}

// Everyone assigned to the product's deliverables, once each, in order.
// TODO(api): creators and mobilographers of the product's shoots — ProductResponse has no shoots.
export function productTeam(deliverables: Deliverable[]): Assignee[] {
  const team = new Map<string, Assignee>()
  for (const { assignee } of deliverables) {
    if (assignee && !team.has(assignee.id)) team.set(assignee.id, assignee)
  }
  return [...team.values()]
}

// The moodboard: images of the product's references, at most `limit`.
export function moodboardImages(references: ReferenceResponse[], limit = 9) {
  return references
    .flatMap((reference) => reference.files.filter((file) => file.kind === 'image'))
    .slice(0, limit)
}

// Case-insensitive match of every word of the query somewhere in the fields.
function matches(fields: (string | null | undefined)[], query: string): boolean {
  const text = fields.filter(Boolean).join(' ').toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

export type ReferenceSort = 'newest' | 'oldest' | 'title_asc' | 'title_desc'

export const referenceSortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_asc', label: 'Name: A–Z' },
  { value: 'title_desc', label: 'Name: Z–A' },
] as const satisfies readonly { value: ReferenceSort; label: string }[]

// A product has a few dozen references at most, all in the product response:
// searching and sorting them here saves a request per keystroke.
export function findReferences(
  references: ReferenceResponse[],
  query: string,
  sort: ReferenceSort,
): ReferenceResponse[] {
  // filter() makes a copy, so sort() below leaves the response untouched.
  const found = references.filter((reference) =>
    matches(
      [reference.title, reference.notes, reference.collection, reference.author, ...reference.tags],
      query,
    ),
  )
  const byDate = (a: ReferenceResponse, b: ReferenceResponse) =>
    a.created_at.localeCompare(b.created_at)
  // Untitled ones go last either way, as in the pool.
  const byTitle = (a: ReferenceResponse, b: ReferenceResponse, direction: 1 | -1) => {
    if (!a.title || !b.title) return Number(!a.title) - Number(!b.title)
    return direction * a.title.localeCompare(b.title)
  }
  const compare = {
    newest: (a: ReferenceResponse, b: ReferenceResponse) => byDate(b, a),
    oldest: byDate,
    title_asc: (a: ReferenceResponse, b: ReferenceResponse) => byTitle(a, b, 1),
    title_desc: (a: ReferenceResponse, b: ReferenceResponse) => byTitle(a, b, -1),
  }[sort]
  return found.sort(compare)
}

export function findDeliverables(deliverables: Deliverable[], query: string): Deliverable[] {
  return deliverables.filter((deliverable) =>
    matches([deliverable.name, deliverable.brief, deliverable.assignee?.name], query),
  )
}

// "1 reference", "6 references".
export function referencesLabel(count: number): string {
  return `${count} ${count === 1 ? 'reference' : 'references'}`
}
