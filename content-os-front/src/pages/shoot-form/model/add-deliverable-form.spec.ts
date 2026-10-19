import * as v from 'valibot'
import { shootDeliverableSchema } from './add-deliverable-form'

describe('shootDeliverableSchema', () => {
  it('needs a name, a type and a product', () => {
    const empty = v.safeParse(shootDeliverableSchema, {
      name: '  ',
      type: undefined,
      productId: undefined,
    })
    expect(v.flatten(empty.issues!).nested).toEqual({
      name: ['Enter the deliverable.'],
      type: ['Select a type.'],
      productId: ['Select a product.'],
    })
  })

  it('keeps the name within the backend limit', () => {
    const long = v.safeParse(shootDeliverableSchema, {
      name: 'a'.repeat(201),
      type: 'video',
      productId: 'p1',
    })
    expect(v.flatten(long.issues!).nested).toEqual({
      name: ['Keep the name under 200 characters.'],
    })
  })

  it('trims the name', () => {
    const filled = v.safeParse(shootDeliverableSchema, {
      name: ' Walk ',
      type: 'image',
      productId: 'p1',
    })
    expect(filled.output).toEqual({ name: 'Walk', type: 'image', productId: 'p1' })
  })
})
