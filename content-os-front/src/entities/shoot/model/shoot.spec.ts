import { durationLabel, progressPercent } from './shoot'

describe('durationLabel', () => {
  it('writes minutes as hours and minutes', () => {
    expect(durationLabel(30)).toBe('30 min')
    expect(durationLabel(60)).toBe('1 h')
    expect(durationLabel(90)).toBe('1 h 30 min')
    expect(durationLabel(360)).toBe('6 h')
  })
})

describe('progressPercent', () => {
  it('is 0 without deliverables and never above 100', () => {
    expect(progressPercent(0, 0)).toBe(0)
    expect(progressPercent(4, 6)).toBe(67)
    expect(progressPercent(9, 8)).toBe(100)
  })
})
