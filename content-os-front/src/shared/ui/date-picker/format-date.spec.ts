import { formatCalendarDate } from './format-date'

const sep18 = { year: 2024, month: 9, day: 18 }

describe('formatCalendarDate', () => {
  it('writes the field value, the month heading and the weekday', () => {
    expect(formatCalendarDate(sep18, { dateStyle: 'medium' })).toBe('Sep 18, 2024')
    expect(formatCalendarDate(sep18, { month: 'long', year: 'numeric' })).toBe('September 2024')
    expect(formatCalendarDate(sep18, { weekday: 'short' })).toBe('Wed')
  })

  it('keeps the day whatever the local time zone', () => {
    // Midnight-sensitive dates: the first and last day of a year.
    expect(formatCalendarDate({ year: 2025, month: 1, day: 1 }, { dateStyle: 'medium' })).toBe(
      'Jan 1, 2025',
    )
    expect(formatCalendarDate({ year: 2024, month: 12, day: 31 }, { dateStyle: 'medium' })).toBe(
      'Dec 31, 2024',
    )
  })
})
