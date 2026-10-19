import * as v from 'valibot'
import type { ProductDeliverableOption } from '../api/shoots'
import type { DeliverableContext } from './add-deliverable'
import { productDeliverableOptions, shootDeliverableSchema } from './add-deliverable-form'

describe('shootDeliverableSchema', () => {
  it('needs a product deliverable, a name and a type', () => {
    const empty = v.safeParse(shootDeliverableSchema, {
      productDeliverableId: undefined,
      name: '  ',
      type: undefined,
    })
    expect(v.flatten(empty.issues!).nested).toEqual({
      productDeliverableId: ['Select the product deliverable.'],
      name: ['Enter the deliverable.'],
      type: ['Select a type.'],
    })
  })

  it('keeps the name within the backend limit', () => {
    const long = v.safeParse(shootDeliverableSchema, {
      productDeliverableId: 'pd1',
      name: 'a'.repeat(201),
      type: 'video',
    })
    expect(v.flatten(long.issues!).nested).toEqual({
      name: ['Keep the name under 200 characters.'],
    })
  })

  it('trims the name', () => {
    const filled = v.safeParse(shootDeliverableSchema, {
      productDeliverableId: 'pd1',
      name: ' Walk ',
      type: 'image',
    })
    expect(filled.output).toEqual({ productDeliverableId: 'pd1', name: 'Walk', type: 'image' })
  })
})

describe('productDeliverableOptions', () => {
  const context: DeliverableContext = {
    shootId: 's1',
    products: [
      { id: 'p2', name: 'Sand Abaya', collection: '', photoUrl: null },
      { id: 'p1', name: 'Black Abaya', collection: '', photoUrl: null },
    ],
    team: [],
    references: [],
  }
  const item = (
    id: string,
    productId: string,
    name: string,
    shoots: ProductDeliverableOption['shoots'] = [],
  ): ProductDeliverableOption => ({
    id,
    product_id: productId,
    name,
    type: 'video',
    brief: null,
    due_date: null,
    shoots,
  })

  it("follows the products' order and says which other shoots close it", () => {
    const options = productDeliverableOptions(context, [
      item('pd1', 'p1', 'Hero walk', [
        { id: 's1', name: 'This shoot', date: '2024-09-18' },
        { id: 's2', name: 'Shoot 04', date: '2024-09-20' },
      ]),
      item('pd2', 'p2', 'Close-up'),
      // A product the shoot no longer has.
      item('pd3', 'gone', 'Story'),
    ])
    expect(options).toEqual([
      { value: 'pd2', label: 'Sand Abaya · Close-up' },
      { value: 'pd1', label: 'Black Abaya · Hero walk · In Shoot 04' },
    ])
  })
})
