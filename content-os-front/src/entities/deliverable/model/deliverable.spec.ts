import { deliverablesLabel, formatDueDate, toDeliverable } from './deliverable'

describe('formatDueDate', () => {
  it('shows the day as in Figma, without a timezone shift', () => {
    expect(formatDueDate('2024-09-18')).toBe('Sep 18, 2024')
    expect(formatDueDate('2024-01-01')).toBe('Jan 1, 2024')
  })

  it('is empty without a date', () => {
    expect(formatDueDate('')).toBe('')
  })
})

describe('toDeliverable', () => {
  it('turns missing date and brief into empty strings', () => {
    expect(
      toDeliverable({
        id: 'd',
        name: 'Walk',
        assignee: null,
        status: 'approved',
        due_date: null,
        brief: null,
      }),
    ).toEqual({ id: 'd', name: 'Walk', assignee: null, status: 'approved', dueDate: '', brief: '' })
  })
})

describe('deliverablesLabel', () => {
  it('counts in singular and plural', () => {
    expect(deliverablesLabel(1)).toBe('1 deliverable')
    expect(deliverablesLabel(6)).toBe('6 deliverables')
  })
})
