import type { ShootCreate } from '../api/shoots'
import type { ShootDeliverable } from './shoot-draft'

// What the form holds when it goes to the server, already validated.
export interface ShootFormData {
  details: {
    name: string
    date: string
    location: string
    startTime: string
    duration: string
  }
  creatorIds: string[]
  mobilographerId: string | undefined
  productIds: string[]
  // The ticked references, new ones already saved to the pool.
  referenceIds: string[]
  deliverables: ShootDeliverable[]
}

// The request for POST /api/shoots. A deliverable keeps only the assignees still
// in the team and the references still ticked: either could change after it was
// added. `savedId` turns a draft reference's id into its id in the pool.
export function toShootCreate(
  data: ShootFormData,
  savedId: (id: string) => string = (id) => id,
): ShootCreate {
  const team = new Set([
    ...data.creatorIds,
    ...(data.mobilographerId ? [data.mobilographerId] : []),
  ])
  const references = new Set(data.referenceIds)
  return {
    name: data.details.name,
    date: data.details.date,
    start_time: data.details.startTime,
    duration_minutes: Number(data.details.duration),
    location: data.details.location,
    creator_ids: data.creatorIds,
    mobilographer_id: data.mobilographerId ?? null,
    product_ids: data.productIds,
    reference_ids: data.referenceIds,
    deliverables: data.deliverables.map((deliverable) => ({
      id: deliverable.saved ? deliverable.id : null,
      name: deliverable.name,
      product_id: deliverable.product.id,
      assignee_ids: deliverable.assignees.map((member) => member.id).filter((id) => team.has(id)),
      reference_ids: deliverable.references
        .map((reference) => savedId(reference.id))
        .filter((id) => references.has(id)),
      due_date: deliverable.dueDate || null,
      status: deliverable.status,
    })),
  }
}
