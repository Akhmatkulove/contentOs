import * as v from 'valibot'
import { shootDetailsSchema } from './shoot-form'

const filled = {
  name: 'Autumn Collection — Lifestyle Shoot',
  date: '2024-09-18',
  location: '',
  startTime: '10:00',
  duration: '360',
}

const errorsOf = (input: Record<string, unknown>) =>
  v.flatten<typeof shootDetailsSchema>(v.safeParse(shootDetailsSchema, input).issues ?? []).nested

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
