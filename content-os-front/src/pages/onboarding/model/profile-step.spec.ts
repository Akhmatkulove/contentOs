import * as v from 'valibot'
import { profileSchema } from './profile-step'

function nameErrors(name: string) {
  const result = v.safeParse(profileSchema, { name })
  return result.success ? [] : v.flatten<typeof profileSchema>(result.issues).nested?.name
}

describe('profileSchema', () => {
  it('trims the name', () => {
    expect(v.parse(profileSchema, { name: '  Amina ' })).toEqual({ name: 'Amina' })
  })

  it('needs a name of at most 100 characters', () => {
    expect(nameErrors('   ')).toEqual(['Enter your name.'])
    expect(nameErrors('a'.repeat(100))).toEqual([])
    expect(nameErrors('a'.repeat(101))).toEqual(['Use at most 100 characters.'])
  })
})
