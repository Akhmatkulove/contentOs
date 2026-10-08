import type { ShootListItem } from '../api/shoots'
import { productsLabel, toShoot } from './shoot'
import { shootTabs } from './shoot-filters'

const item: ShootListItem = {
  id: 's1',
  name: 'Shoot 04 — Autumn Drop',
  date: '2024-09-18',
  start_time: '10:00:00',
  duration_minutes: 120,
  location: null,
  status: 'in_progress',
  photo: null,
  products: 4,
  deliverables: 14,
  approved: 8,
  team: [],
}

describe('toShoot', () => {
  it('formats the date and works out the progress', () => {
    expect(toShoot(item)).toMatchObject({
      date: 'Sep 18, 2024',
      location: '',
      photoUrl: null,
      percent: 57,
    })
  })
})

describe('productsLabel', () => {
  it('counts in singular and plural', () => {
    expect(productsLabel(1)).toBe('1 product')
    expect(productsLabel(4)).toBe('4 products')
  })
})

describe('shootTabs', () => {
  it('shows a count per tab, zero before the list loads', () => {
    expect(shootTabs(undefined).map((tab) => tab.count)).toEqual([0, 0, 0, 0])
    const counts = {
      all: 12,
      upcoming: 4,
      to_shoot: 0,
      in_progress: 5,
      needs_review: 0,
      completed: 3,
    }
    expect(shootTabs(counts).map((tab) => `${tab.label} (${tab.count})`)).toEqual([
      'All (12)',
      'Upcoming (4)',
      'In progress (5)',
      'Completed (3)',
    ])
  })
})
