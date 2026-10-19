import type { ShootDetails } from '@/entities/shoot'

const member = (id: string, name: string) => ({ id, name, photo_url: null })
const counts = (approved: number, total: number) => ({
  total,
  approved,
  to_shoot: total - approved,
  in_progress: 0,
  needs_review: 0,
  needs_changes: 0,
})

// A saved shoot as GET /api/shoots/{id} returns it, for tests.
export function shootDetails(overrides: Partial<ShootDetails> = {}): ShootDetails {
  return {
    id: 's1',
    name: 'Shoot 04 — Autumn Drop',
    date: '2024-09-18',
    start_time: '10:00:00',
    duration_minutes: 360,
    location: 'Tashkent Studio',
    status: 'in_progress',
    art_director: member('ad', 'Risolat'),
    creators: [member('amina', 'Amina')],
    mobilographers: [member('odina', 'Odina')],
    products: [
      {
        id: 'p1',
        name: 'Black Abaya 042',
        collection: 'Autumn Drop',
        category: 'Abayas',
        photo: { id: 'f1', kind: 'image', content_type: 'image/webp', url: 'abaya.webp' },
        deliverables: counts(1, 2),
      },
      {
        id: 'p2',
        name: 'Cream Dress 011',
        collection: null,
        category: null,
        photo: null,
        deliverables: counts(0, 1),
      },
    ],
    references: [
      {
        id: 'r1',
        title: 'Walk',
        type: 'video',
        link: null,
        collection: null,
        notes: null,
        tags: [],
        product_id: null,
        author_id: 'ad',
        author: 'Risolat',
        files: [],
        favorite: false,
        created_at: '2024-09-01T00:00:00Z',
      },
    ],
    deliverables: [
      {
        id: 'd1',
        name: 'Fabric close-up',
        type: 'image',
        product_id: 'p1',
        assignees: [member('odina', 'Odina')],
        reference_ids: ['r1'],
        due_date: '2024-09-19',
        status: 'approved',
      },
      {
        id: 'd2',
        name: 'Detail movement',
        type: 'image',
        product_id: 'p1',
        assignees: [member('amina', 'Amina'), member('odina', 'Odina')],
        reference_ids: [],
        due_date: null,
        status: 'to_shoot',
      },
      {
        id: 'd3',
        name: 'Story clips',
        type: 'video',
        product_id: 'p2',
        assignees: [],
        reference_ids: [],
        due_date: '2024-09-18',
        status: 'to_shoot',
      },
    ],
    can_edit: true,
    ...overrides,
  }
}
