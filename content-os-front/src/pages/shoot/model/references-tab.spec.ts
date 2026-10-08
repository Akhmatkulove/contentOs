import { shootDetails } from './fixtures'
import { toProducts } from './products-tab'
import {
  defaultReferenceFilters,
  findReferences,
  referenceProductOptions,
  referenceUsage,
  usageLabel,
} from './references-tab'

const shoot = shootDetails()

describe('findReferences', () => {
  const walk = shoot.references[0]!
  const references = [
    walk,
    {
      ...walk,
      id: 'r2',
      title: 'Light',
      type: 'image' as const,
      product_id: 'p1',
      tags: ['soft'],
      created_at: '2024-09-02T00:00:00Z',
    },
    {
      ...walk,
      id: 'r3',
      title: null,
      type: 'moodboard' as const,
      created_at: '2024-08-01T00:00:00Z',
    },
  ]
  const ids = (filters: Partial<typeof defaultReferenceFilters>) =>
    findReferences([...references], { ...defaultReferenceFilters, ...filters }).map((r) => r.id)

  it('searches titles and tags', () => {
    expect(ids({ search: 'soft' })).toEqual(['r2'])
  })
  it('filters by product and type', () => {
    expect(ids({ productId: 'p1' })).toEqual(['r2'])
    expect(ids({ type: 'moodboard' })).toEqual(['r3'])
  })
  it('sorts by date and by name with untitled last', () => {
    expect(ids({})).toEqual(['r2', 'r1', 'r3'])
    expect(ids({ sort: 'oldest' })).toEqual(['r3', 'r1', 'r2'])
    expect(ids({ sort: 'title_asc' })).toEqual(['r2', 'r1', 'r3'])
  })
})

describe('referenceUsage', () => {
  it('counts the deliverables that follow each reference', () => {
    expect(referenceUsage(shoot)).toEqual(new Map([['r1', 1]]))
  })
  it('labels used and unused references', () => {
    expect(usageLabel(0)).toBe('Assigned to this shoot')
    expect(usageLabel(1)).toBe('Used in 1 deliverable')
    expect(usageLabel(2)).toBe('Used in 2 deliverables')
  })
})

describe('referenceProductOptions', () => {
  it('offers only the products the references belong to', () => {
    const references = [{ ...shoot.references[0]!, product_id: 'p2' }]
    expect(referenceProductOptions(references, toProducts(shoot)).map((o) => o.value)).toEqual([
      'all',
      'p2',
    ])
  })
})
