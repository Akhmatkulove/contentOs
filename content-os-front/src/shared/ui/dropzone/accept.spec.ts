import { matchesAccept } from './accept'

const file = (name: string, type: string) => new File(['x'], name, { type })

describe('matchesAccept', () => {
  it('takes anything when accept is empty', () => {
    expect(matchesAccept(file('a.pdf', 'application/pdf'), '')).toBe(true)
  })

  it('matches wildcards, exact types and extensions', () => {
    expect(matchesAccept(file('a.png', 'image/png'), 'image/*')).toBe(true)
    expect(matchesAccept(file('a.pdf', 'application/pdf'), 'image/*')).toBe(false)
    expect(matchesAccept(file('a.png', 'image/png'), 'image/jpeg, image/png')).toBe(true)
    expect(matchesAccept(file('A.HEIC', ''), 'image/*,.heic')).toBe(true)
  })
})
