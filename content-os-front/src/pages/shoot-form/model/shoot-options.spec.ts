import { durationLabel, durationOptions, formatStartTime, startTimeOptions } from './shoot-options'

describe('formatStartTime', () => {
  it('reads "HH:MM" as a 12-hour time', () => {
    expect(formatStartTime('10:00')).toBe('10:00 AM')
    expect(formatStartTime('13:30')).toBe('1:30 PM')
    expect(formatStartTime('12:00')).toBe('12:00 PM')
    expect(formatStartTime('00:30')).toBe('12:30 AM')
  })
})

describe('startTimeOptions', () => {
  it('runs every half hour from 6 AM to 10 PM', () => {
    expect(startTimeOptions[0]).toEqual({ value: '06:00', label: '6:00 AM' })
    expect(startTimeOptions[1]?.value).toBe('06:30')
    expect(startTimeOptions.at(-1)).toEqual({ value: '22:00', label: '10:00 PM' })
  })
})

describe('durations', () => {
  it('offers 1 to 12 hours', () => {
    expect(durationLabel(1)).toBe('1 hour')
    expect(durationLabel(6)).toBe('6 hours')
    expect(durationOptions).toHaveLength(12)
    expect(durationOptions[5]).toEqual({ value: '6', label: '6 hours' })
  })
})
