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
  it('needs at least one ticked product', () => {
    expect(v.safeParse(shootSchema, { details: filled, productIds: ['p1'] }).success).toBe(true)

    const result = v.safeParse(shootSchema, { details: filled, productIds: [] })
    expect(result.success).toBe(false)
    expect(result.issues?.map((issue) => issue.message)).toEqual(['Select at least one product.'])
  })
})
