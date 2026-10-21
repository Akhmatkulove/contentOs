import { greeting, monthStart, todayLabel } from './greeting'

describe('greeting', () => {
  it.each([
    [0, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [17, 'Good afternoon'],
    [18, 'Good evening'],
    [23, 'Good evening'],
  ])('at %i:00 says %s', (hour, expected) => {
    expect(greeting(new Date(2024, 8, 10, hour, 30))).toBe(expected)
  })
})

describe('todayLabel', () => {
  it('reads like the Figma top bar', () => {
    expect(todayLabel(new Date(2024, 8, 10))).toBe('Tue, Sep 10, 2024')
  })
})

describe('monthStart', () => {
  it('is local midnight of the 1st', () => {
    expect(monthStart(new Date(2024, 8, 10, 15, 30))).toEqual(new Date(2024, 8, 1))
  })
})
