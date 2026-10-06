import { deliveryPercent, productsLabel, productSubtitle, toProduct } from './product'

describe('toProduct', () => {
  it('takes the cover photo url, or none', () => {
    const item = {
      id: '1',
      name: 'Linen shirt',
      collection: 'Summer 26',
      sku: null,
      status: 'active' as const,
      created_at: '2026-10-04T10:00:00Z',
    }
    expect(toProduct({ ...item, photo: null }).photoUrl).toBeNull()
    expect(
      toProduct({
        ...item,
        photo: { id: 'f', kind: 'image', content_type: 'image/webp', url: 'https://s/f.webp' },
      }).photoUrl,
    ).toBe('https://s/f.webp')
  })
})

describe('productSubtitle', () => {
  it('joins collection and SKU, leaving out what is missing', () => {
    expect(productSubtitle({ collection: 'Summer 26', sku: 'LS-01' })).toBe('Summer 26 · LS-01')
    expect(productSubtitle({ collection: null, sku: 'LS-01' })).toBe('LS-01')
    expect(productSubtitle({ collection: null, sku: null })).toBe('')
  })
})

describe('deliveryPercent', () => {
  it('rounds to a whole percent', () => {
    expect(deliveryPercent({ done: 6, total: 8 })).toBe(75)
    expect(deliveryPercent({ done: 7, total: 8 })).toBe(88)
  })

  it('is 0 when nothing is planned yet', () => {
    expect(deliveryPercent({ done: 0, total: 0 })).toBe(0)
  })

  it('never goes past 100', () => {
    expect(deliveryPercent({ done: 9, total: 8 })).toBe(100)
  })
})

describe('productsLabel', () => {
  it('counts in singular and plural', () => {
    expect(productsLabel(1)).toBe('1 product')
    expect(productsLabel(0)).toBe('0 products')
    expect(productsLabel(3)).toBe('3 products')
  })
})
