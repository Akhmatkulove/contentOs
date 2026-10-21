import { timeAgo } from './time-ago'

const now = new Date('2024-09-18T12:00:00Z')

describe('timeAgo', () => {
  it('counts minutes and hours, then names the day', () => {
    expect(timeAgo('2024-09-18T11:59:30Z', now)).toBe('Just now')
    expect(timeAgo('2024-09-18T11:55:00Z', now)).toBe('5 min ago')
    expect(timeAgo('2024-09-18T09:00:00Z', now)).toBe('3 h ago')
    expect(timeAgo('2024-09-17T09:00:00Z', now)).toBe('Yesterday')
    expect(timeAgo('2024-09-10T09:00:00Z', now)).toBe('Sep 10')
  })
})
