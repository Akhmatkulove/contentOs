import type { ShootDetails } from '@/entities/shoot'
import { fromShoot } from './shoot-initial'

const member = (id: string) => ({ id, name: id, photo_url: null })

const shoot: ShootDetails = {
  id: 's1',
  name: 'Autumn Drop',
  date: '2024-09-18',
  start_time: '10:30:00',
  duration_minutes: 90,
  location: null,
  status: 'upcoming',
  art_director: member('ad'),
  creators: [member('lana')],
  mobilographers: [member('odina'), member('dilya')],
  products: [
    {
      id: 'p1',
      name: 'Abaya',
      collection: null,
      category: null,
      photo: null,
      deliverables: {
        total: 1,
        to_shoot: 1,
        in_progress: 0,
        needs_review: 0,
        needs_changes: 0,
        approved: 0,
      },
    },
  ],
  references: [],
  deliverables: [
    {
      id: 'd1',
      name: 'Walk',
      type: 'video',
      product_id: 'p1',
      assignees: [member('lana')],
      reference_ids: ['gone'],
      due_date: null,
      status: 'in_progress',
    },
  ],
  can_edit: true,
}

describe('fromShoot', () => {
  it('fills the form with the saved shoot', () => {
    const initial = fromShoot(shoot)
    expect(initial.details).toEqual({
      name: 'Autumn Drop',
      date: '2024-09-18',
      location: '',
      startTime: '10:30',
      duration: '90',
    })
    expect(initial.creatorIds).toEqual(['lana'])
    expect(initial.mobilographerIds).toEqual(['odina', 'dilya'])
    expect(initial.members.map((m) => m.id)).toEqual(['lana', 'odina', 'dilya'])
    expect(initial.products).toEqual([{ id: 'p1', name: 'Abaya', collection: '', photoUrl: null }])
  })

  it('marks deliverables as saved, so they keep their ids', () => {
    const [walk] = fromShoot(shoot).deliverables
    expect(walk).toMatchObject({ id: 'd1', saved: true, status: 'in_progress', dueDate: '' })
    // References no longer in the shoot are dropped.
    expect(walk?.references).toEqual([])
  })
})
