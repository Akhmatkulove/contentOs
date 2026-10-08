import * as v from 'valibot'
import { shootDeliverableSchema } from './add-deliverable-form'

describe('shootDeliverableSchema', () => {
  it('needs a name and a product', () => {
    const empty = v.safeParse(shootDeliverableSchema, { name: '  ', productId: undefined })
    expect(v.flatten(empty.issues!).nested).toEqual({
      name: ['Enter the deliverable.'],
      productId: ['Select a product.'],
    })
  })

  it('keeps the name within the backend limit', () => {
    const long = v.safeParse(shootDeliverableSchema, { name: 'a'.repeat(201), productId: 'p1' })
    expect(v.flatten(long.issues!).nested).toEqual({
      name: ['Keep the name under 200 characters.'],
    })
  })

  it('trims the name', () => {
    const filled = v.safeParse(shootDeliverableSchema, { name: ' Walk ', productId: 'p1' })
    expect(filled.output).toEqual({ name: 'Walk', productId: 'p1' })
  })
})
