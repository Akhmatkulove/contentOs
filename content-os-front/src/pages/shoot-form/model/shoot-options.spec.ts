import { durationOptions, formatTime, startTimeOptions } from './shoot-options'

describe('formatTime', () => {
  it('writes minutes since midnight as a 24-hour time', () => {
    expect(formatTime(10 * 60)).toBe('10:00')
    expect(formatTime(13 * 60 + 30)).toBe('13:30')
    expect(formatTime(9 * 60 + 5)).toBe('09:05')
    expect(formatTime(0)).toBe('00:00')
  })
})

describe('startTimeOptions', () => {
  it('runs every half hour from 06:00 to 22:00, labelled as the value', () => {
    expect(startTimeOptions[0]).toEqual({ value: '06:00', label: '06:00' })
    expect(startTimeOptions[1]).toEqual({ value: '06:30', label: '06:30' })
    expect(startTimeOptions.find((option) => option.value === '13:00')?.label).toBe('13:00')
    expect(startTimeOptions.at(-1)).toEqual({ value: '22:00', label: '22:00' })
  })
})

describe('durationOptions', () => {
  it('runs every half hour from 30 min to 12 h, valued in minutes', () => {
    expect(durationOptions).toHaveLength(24)
    expect(durationOptions[0]).toEqual({ value: '30', label: '30 min' })
    expect(durationOptions[2]).toEqual({ value: '90', label: '1 h 30 min' })
    expect(durationOptions.at(-1)).toEqual({ value: '720', label: '12 h' })
  })
})
