// Formats a calendar date (year, month, day — no time, no zone) in English.
//
// Not through DateValue.toDate(): that builds a local-midnight Date, which a
// patched global Date (some browser extensions replace it) turns into "now",
// so the field showed today and the month heading never moved. A UTC
// timestamp read back in UTC needs only Date.UTC and Intl, and can't shift a
// day across time zones either.
export interface CalendarDay {
  year: number
  month: number
  day: number
}

export function formatCalendarDate(date: CalendarDay, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
    Date.UTC(date.year, date.month - 1, date.day),
  )
}
