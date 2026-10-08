import { shootDetails } from './fixtures'
import { findProducts, toProducts } from './products-tab'

const shoot = shootDetails()

describe('toProducts', () => {
  it('joins collection and category and works out the progress', () => {
    const [abaya, dress] = toProducts(shoot)
    expect(abaya).toMatchObject({
      subtitle: 'Autumn Drop · Abayas',
      photoUrl: 'abaya.webp',
      percent: 50,
    })
    expect(dress).toMatchObject({ subtitle: '', collection: '', photoUrl: null, percent: 0 })
  })
})

describe('findProducts', () => {
  const products = toProducts(shoot)
  it('searches name, collection and category', () => {
    expect(findProducts(products, 'abayas', 'order').map((p) => p.id)).toEqual(['p1'])
  })
  it('sorts by name and by progress', () => {
    expect(findProducts(products, '', 'name_desc').map((p) => p.id)).toEqual(['p2', 'p1'])
    expect(findProducts(products, '', 'progress').map((p) => p.id)).toEqual(['p1', 'p2'])
  })
})
