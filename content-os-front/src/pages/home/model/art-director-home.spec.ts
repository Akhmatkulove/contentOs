import type { Schemas } from '@/shared/api'
import { teamChips, toShootTile, toTaskRow } from './art-director-home'

function shoot(overrides: Partial<Schemas['ShootListItem']> = {}): Schemas['ShootListItem'] {
  return {
    id: 's1',
    name: 'Shoot 04 — Autumn Drop',
    date: '2024-09-18',
    start_time: '10:00:00',
    duration_minutes: 120,
    location: 'Tashkent Studio',
    status: 'in_progress',
    photo: null,
    products: 3,
    deliverables: 14,
    approved: 8,
    team: [],
    ...overrides,
  }
}

describe('toShootTile', () => {
  it('joins the date and the location and counts the progress', () => {
    const tile = toShootTile(shoot())
    expect(tile.meta).toBe('Sep 18, 2024 · Tashkent Studio')
    expect(tile.status).toEqual({ label: 'In progress', tone: 'info' })
    expect(tile.percent).toBe(57)
  })

  it('leaves out a missing location', () => {
    expect(toShootTile(shoot({ location: null })).meta).toBe('Sep 18, 2024')
  })
})

describe('toTaskRow', () => {
  it('ticks only approved tasks', () => {
    const item = {
      id: 't1',
      name: 'Review fabric close-ups',
      status: 'approved',
      product: { id: 'p1', name: 'Black Abaya 042', sku: null, photo: null },
    } as Schemas['TaskItem']
    expect(toTaskRow(item)).toEqual({
      id: 't1',
      name: 'Review fabric close-ups',
      product: 'Black Abaya 042',
      done: true,
      review: false,
    })
    expect(toTaskRow({ ...item, status: 'needs_review' })).toMatchObject({
      done: false,
      review: true,
    })
  })
})

describe('teamChips', () => {
  it('puts the art director first, then the creators', () => {
    const me = { id: 'me', name: 'Risolat', photo_url: null }
    const amina = { id: 'a', name: 'Amina', photo_url: 'a.jpg' }
    expect(teamChips(me, [amina]).map((chip) => [chip.name, chip.role])).toEqual([
      ['Risolat', 'Art Director'],
      ['Amina', 'Creator'],
    ])
    expect(teamChips(null, [amina])).toHaveLength(1)
  })
})
