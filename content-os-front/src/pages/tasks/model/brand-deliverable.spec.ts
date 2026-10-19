import type { BrandDeliverableItem } from '../api/brand-deliverables'
import {
  brandDeliverablesShowing,
  brandDeliverableTabs,
  toBrandDeliverable,
} from './brand-deliverable'

const item = (fields: Partial<BrandDeliverableItem> = {}): BrandDeliverableItem => ({
  id: 'd1',
  name: 'Hero reel',
  type: 'video',
  brief: null,
  due_date: '2024-09-20',
  status: 'to_shoot',
  shoots_total: 0,
  shoots: [],
  product: { id: 'p1', name: 'Abaya', sku: null, photo: null },
  brand: { id: 'b1', name: 'Acme', photo_url: null },
  ...fields,
})

const today = new Date(2024, 8, 18)

describe('toBrandDeliverable', () => {
  it('plans a shoot for a deliverable no shoot closes yet', () => {
    const row = toBrandDeliverable(item(), today)
    expect(row.status.label).toBe('Not scheduled')
    expect(row.due).toEqual({ label: 'In 2 days', urgent: false })
    expect(row.action).toEqual({
      kind: 'plan',
      label: 'Plan shoot',
      to: { name: 'shoot-create', query: { product: 'p1', deliverable: 'd1' } },
    })
  })

  it('opens the first shoot of a planned one', () => {
    const shoots = [{ id: 's1', name: 'Shoot 04', date: '2024-09-19' }]
    const row = toBrandDeliverable(item({ shoots_total: 1, shoots }), today)
    expect(row.status.label).toBe('To shoot')
    expect(row.shoots).toEqual([{ id: 's1', name: 'Shoot 04' }])
    expect(row.action).toMatchObject({
      kind: 'view',
      to: { name: 'shoot', params: { id: 's1' } },
    })
  })

  it("opens the product when only another art director's shoot closes it", () => {
    const row = toBrandDeliverable(item({ status: 'in_progress', shoots_total: 1 }), today)
    expect(row.action.to).toEqual({ name: 'product', params: { id: 'p1' } })
  })
})

describe('brandDeliverableTabs', () => {
  it('puts Not scheduled right after All, with the counts', () => {
    const tabs = brandDeliverableTabs({
      all: 3,
      not_scheduled: 2,
      to_shoot: 1,
      in_progress: 0,
      needs_review: 0,
      needs_changes: 0,
      approved: 0,
    })
    expect(tabs.slice(0, 3)).toEqual([
      { value: 'all', label: 'All', count: 3 },
      { value: 'not_scheduled', label: 'Not scheduled', count: 2 },
      { value: 'to_shoot', label: 'To shoot', count: 1 },
    ])
  })
})

describe('brandDeliverablesShowing', () => {
  it('counts deliverables', () => {
    expect(brandDeliverablesShowing(1, 1)).toBe('Showing 1 of 1 deliverable')
    expect(brandDeliverablesShowing(2, 5)).toBe('Showing 2 of 5 deliverables')
  })
})
