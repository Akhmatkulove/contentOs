import type { ProductDetails } from '@/entities/product'
import { toShootPlan } from './shoot-plan'

describe('toShootPlan', () => {
  it('starts the shoot with the product and its first photo', () => {
    const product = {
      id: 'p1',
      name: 'Abaya',
      collection: null,
      status: 'active',
      photos: [{ id: 'f1', url: '/abaya.webp' }],
    } as unknown as ProductDetails
    expect(toShootPlan(product, 'd1')).toEqual({
      product: {
        id: 'p1',
        name: 'Abaya',
        collection: '',
        photoUrl: '/abaya.webp',
        archived: false,
      },
      productDeliverableId: 'd1',
    })
  })
})
