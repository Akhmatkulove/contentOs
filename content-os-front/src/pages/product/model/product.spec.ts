import type { Deliverable } from '@/entities/deliverable'
import type { ProductDetails } from '@/entities/product'
import type { Schemas } from '@/shared/api'
import {
  deliveryProgress,
  findDeliverables,
  findReferences,
  moodboardImages,
  productFacts,
  productMeta,
  productTeam,
  referencesLabel,
} from './product'

const product = (fields: Partial<ProductDetails>) =>
  ({ collection: null, category: null, sku: null, ...fields }) as ProductDetails

const amina = { id: 'a', name: 'Amina', photo_url: null }
const odina = { id: 'o', name: 'Odina', photo_url: '/odina.webp' }

const deliverable = (fields: Partial<Deliverable>): Deliverable => ({
  id: crypto.randomUUID(),
  name: 'Walk',
  type: 'video',
  assignee: amina,
  status: 'to_shoot',
  shoots: 0,
  dueDate: '',
  brief: '',
  ...fields,
})

const reference = (
  fields: Partial<Schemas['ReferenceResponse']>,
): Schemas['ReferenceResponse'] => ({
  id: crypto.randomUUID(),
  title: null,
  type: null,
  link: null,
  collection: null,
  notes: null,
  tags: [],
  product_id: 'p',
  author_id: 'b',
  author: 'Acme',
  files: [],
  favorite: false,
  created_at: '2026-10-01T10:00:00Z',
  ...fields,
})

const image = (id: string) => ({ id, kind: 'image' as const, content_type: 'image/webp', url: id })

describe('productMeta and productFacts', () => {
  it('leave out what is missing', () => {
    const full = product({ collection: 'Autumn 26', category: 'Abayas', sku: 'BA-042' })
    expect(productMeta(full)).toEqual(['Autumn 26', 'Abayas', 'SKU: BA-042'])
    expect(productMeta(product({ category: 'Abayas' }))).toEqual(['Abayas'])
    expect(productFacts(product({ sku: 'BA-042' }))).toEqual([{ label: 'SKU', value: 'BA-042' }])
  })
})

describe('deliveryProgress', () => {
  it('counts statuses and takes approved as done', () => {
    const progress = deliveryProgress([
      deliverable({ status: 'approved' }),
      deliverable({ status: 'approved' }),
      deliverable({ status: 'needs_changes' }),
    ])
    expect(progress).toEqual({
      done: 2,
      total: 3,
      percent: 67,
      counts: { approved: 2, needs_changes: 1, in_progress: 0, needs_review: 0, to_shoot: 0 },
    })
  })

  it('is 0% with nothing planned', () => {
    expect(deliveryProgress([]).percent).toBe(0)
  })
})

describe('productTeam', () => {
  it('lists each assignee once and skips unassigned deliverables', () => {
    const team = productTeam([
      deliverable({ assignee: amina }),
      deliverable({ assignee: null }),
      deliverable({ assignee: odina }),
      deliverable({ assignee: amina }),
    ])
    expect(team).toEqual([amina, odina])
  })
})

describe('moodboardImages', () => {
  it('takes images of every reference, without videos, up to the limit', () => {
    const video = { id: 'v', kind: 'video' as const, content_type: 'video/mp4', url: 'v' }
    const images = moodboardImages(
      [reference({ files: [image('1'), video] }), reference({ files: [image('2'), image('3')] })],
      2,
    )
    expect(images.map((file) => file.id)).toEqual(['1', '2'])
  })
})

describe('findReferences', () => {
  const walk = reference({ title: 'Walk', tags: ['outdoor'], created_at: '2026-10-01T10:00:00Z' })
  const fabric = reference({
    title: 'Fabric',
    notes: 'Close-up',
    created_at: '2026-10-03T10:00:00Z',
  })
  const link = reference({ created_at: '2026-10-02T10:00:00Z' })
  const all = [walk, fabric, link]

  it('searches title, notes and tags, any case, every word', () => {
    expect(findReferences(all, 'OUTDOOR', 'newest')).toEqual([walk])
    expect(findReferences(all, 'close fabric', 'newest')).toEqual([fabric])
    expect(findReferences(all, 'close walk', 'newest')).toEqual([])
  })

  it('sorts by date or by title with untitled last', () => {
    expect(findReferences(all, '', 'newest')).toEqual([fabric, link, walk])
    expect(findReferences(all, '', 'oldest')).toEqual([walk, link, fabric])
    expect(findReferences(all, '', 'title_asc')).toEqual([fabric, walk, link])
    expect(findReferences(all, '', 'title_desc')).toEqual([walk, fabric, link])
  })
})

describe('findDeliverables', () => {
  it('searches name, brief and assignee', () => {
    const walk = deliverable({ name: 'Walk', assignee: odina })
    const close = deliverable({ name: 'Close-up', brief: 'Texture' })
    expect(findDeliverables([walk, close], 'odina')).toEqual([walk])
    expect(findDeliverables([walk, close], 'texture')).toEqual([close])
  })
})

describe('referencesLabel', () => {
  it('counts in singular and plural', () => {
    expect(referencesLabel(1)).toBe('1 reference')
    expect(referencesLabel(6)).toBe('6 references')
  })
})
