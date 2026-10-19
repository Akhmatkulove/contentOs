import type { ShootDeliverable } from './shoot-draft'
import { toShootCreate, type ShootFormData } from './shoot-request'

const member = (id: string) => ({ id, name: id, photo_url: null })

const walk: ShootDeliverable = {
  id: 'd1',
  name: 'Walking transition',
  type: 'video',
  product: { id: 'p1', name: 'Abaya', collection: '', photoUrl: null },
  references: [
    { id: 'draft-1', title: 'New', previewUrl: null },
    { id: 'r2', title: 'Unticked later', previewUrl: null },
  ],
  assignees: [member('lana'), member('gone')],
  dueDate: '',
  status: 'to_shoot',
}

const data: ShootFormData = {
  details: {
    name: 'Autumn Drop',
    date: '2024-09-18',
    location: '',
    startTime: '10:00',
    duration: '90',
  },
  creatorIds: ['lana'],
  mobilographerIds: ['odina'],
  productIds: ['p1'],
  referenceIds: ['r1'],
  deliverables: [walk],
}

describe('toShootCreate', () => {
  it('maps the form to the request', () => {
    const body = toShootCreate(data, (id) => (id === 'draft-1' ? 'r1' : id))
    expect(body).toMatchObject({
      name: 'Autumn Drop',
      date: '2024-09-18',
      start_time: '10:00',
      duration_minutes: 90,
      creator_ids: ['lana'],
      mobilographer_ids: ['odina'],
      product_ids: ['p1'],
      reference_ids: ['r1'],
    })
    // Saved drafts by their pool id; people out of the team and unticked
    // references left out.
    expect(body.deliverables).toEqual([
      {
        id: null,
        name: 'Walking transition',
        type: 'video',
        product_id: 'p1',
        assignee_ids: ['lana'],
        reference_ids: ['r1'],
        due_date: null,
        status: 'to_shoot',
      },
    ])
  })

  it('keeps the id of a saved deliverable and leaves its status to the server', () => {
    const body = toShootCreate({
      ...data,
      deliverables: [{ ...walk, saved: true, status: 'needs_review' }],
    })
    expect(body.deliverables[0]).toMatchObject({ id: 'd1', status: null })
  })

  it('keeps every mobilographer, and their deliverables', () => {
    const body = toShootCreate({
      ...data,
      mobilographerIds: ['odina', 'dilya'],
      deliverables: [{ ...walk, assignees: [member('dilya'), member('odina')] }],
    })
    expect(body.mobilographer_ids).toEqual(['odina', 'dilya'])
    expect(body.deliverables[0]!.assignee_ids).toEqual(['dilya', 'odina'])
  })
})
