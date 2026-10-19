import { toReference, type Reference } from '@/entities/reference'
import type { ShootDetails } from '@/entities/shoot'
import type { ShootDeliverable, ShootProduct, TeamMember } from './shoot-draft'

// What the edit form starts from: the saved shoot in the form's own shapes.
export interface ShootFormInitial {
  details: {
    name: string
    date: string
    location: string
    // "HH:MM", see startTimeOptions.
    startTime: string
    // Minutes as a string, see durationOptions.
    duration: string
  }
  creatorIds: string[]
  mobilographerIds: string[]
  // The team as saved: kept even if an admin has since unlinked someone.
  members: TeamMember[]
  products: ShootProduct[]
  references: Reference[]
  deliverables: ShootDeliverable[]
}

export function fromShoot(shoot: ShootDetails): ShootFormInitial {
  const products: ShootProduct[] = shoot.products.map((product) => ({
    id: product.id,
    name: product.name,
    collection: product.collection ?? '',
    photoUrl: product.photo?.url ?? null,
    archived: product.archived,
  }))
  const references = shoot.references.map(toReference)
  const byId = new Map(references.map((reference) => [reference.id, reference]))
  return {
    details: {
      name: shoot.name,
      date: shoot.date,
      location: shoot.location ?? '',
      // "10:00:00" → "10:00".
      startTime: shoot.start_time.slice(0, 5),
      duration: String(shoot.duration_minutes),
    },
    creatorIds: shoot.creators.map((member) => member.id),
    mobilographerIds: shoot.mobilographers.map((member) => member.id),
    members: [...shoot.creators, ...shoot.mobilographers],
    products,
    references,
    deliverables: shoot.deliverables.flatMap((deliverable) => {
      const product = products.find((item) => item.id === deliverable.product_id)
      if (!product) return []
      return {
        id: deliverable.id,
        saved: true,
        name: deliverable.name,
        type: deliverable.type,
        product,
        productDeliverable: deliverable.product_deliverable,
        references: deliverable.reference_ids.flatMap((id) => {
          const reference = byId.get(id)
          return reference
            ? { id: reference.id, title: reference.title, previewUrl: reference.previewUrl }
            : []
        }),
        assignees: deliverable.assignees,
        dueDate: deliverable.due_date ?? '',
        status: deliverable.status,
      }
    }),
  }
}
