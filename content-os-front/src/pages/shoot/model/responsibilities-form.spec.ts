import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { responsibilitiesSchema } from './responsibilities-form'

describe('responsibilitiesSchema', () => {
  const parse = (responsibilities: string) =>
    v.safeParse(responsibilitiesSchema, { responsibilities })

  it('trims the text and lets it be empty to clear the list', () => {
    expect(parse('  Model\nEdit  ').output).toEqual({ responsibilities: 'Model\nEdit' })
    expect(parse('   ').output).toEqual({ responsibilities: '' })
  })
  it('stops at 2000 characters like the server', () => {
    expect(parse('x'.repeat(2000)).success).toBe(true)
    expect(v.flatten(parse('x'.repeat(2001)).issues!).nested).toEqual({
      responsibilities: ['Keep the responsibilities under 2000 characters.'],
    })
  })
})
