import { formatDueDate } from './deliverable-draft'

describe('formatDueDate', () => {
  it('shows the day as in Figma, without a timezone shift', () => {
    expect(formatDueDate('2024-09-18')).toBe('Sep 18, 2024')
    expect(formatDueDate('2024-01-01')).toBe('Jan 1, 2024')
  })

  it('is empty without a date', () => {
    expect(formatDueDate('')).toBe('')
  })
})
