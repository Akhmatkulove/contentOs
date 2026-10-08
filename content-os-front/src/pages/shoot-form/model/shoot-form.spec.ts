import * as v from 'valibot'
import { shootDetailsSchema, shootSchema } from './shoot-form'

const filled = {
  name: 'Autumn Collection — Lifestyle Shoot',
  date: '2024-09-18',
  location: '',
  startTime: '10:00',
  duration: '360',
}

function errorsOf(input: Record<string, unknown>) {
  const result = v.safeParse(shootDetailsSchema, input)
  return result.success ? {} : v.flatten<typeof shootDetailsSchema>(result.issues).nested
}

describe('shootDetailsSchema', () => {
  it('needs everything but the location', () => {
    expect(v.safeParse(shootDetailsSchema, filled).success).toBe(true)
  })

  it('names each missing required field', () => {
    expect(
      errorsOf({ name: '', date: '', location: '', startTime: undefined, duration: undefined }),
    ).toEqual({
      name: ['Enter the shoot name.'],
      date: ['Pick the shoot date.'],
      startTime: ['Pick the start time.'],
      duration: ['Pick the estimated duration.'],
    })
  })

  it('does not take spaces for a name', () => {
    expect(errorsOf({ ...filled, name: '   ' })).toEqual({ name: ['Enter the shoot name.'] })
  })
})

describe('shootSchema', () => {
  const messages = (input: Record<string, unknown>) =>
    v.safeParse(shootSchema, { details: filled, ...input }).issues?.map((issue) => issue.message)

  it('needs a ticked product and a deliverable', () => {
    expect(messages({ productIds: ['p1'], deliverableProductIds: ['p1'] })).toBeUndefined()
    expect(messages({ productIds: [], deliverableProductIds: [] })).toEqual([
      'Select at least one product.',
      'Add at least one deliverable.',
    ])
  })

  it('needs every deliverable to be for a ticked product', () => {
    const result = v.safeParse(shootSchema, {
      details: filled,
      productIds: ['p1'],
      deliverableProductIds: ['p1', 'p2'],
    })
    expect(result.issues?.map((issue) => issue.message)).toEqual([
      'A deliverable is for a product that is no longer selected.',
    ])
    expect(v.flatten<typeof shootSchema>(result.issues!).nested).toHaveProperty(
      'deliverableProductIds',
    )
  })
})
