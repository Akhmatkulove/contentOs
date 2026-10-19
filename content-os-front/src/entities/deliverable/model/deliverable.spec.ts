import { deliverablesLabel, dueHint, formatDueDate, toDeliverable } from './deliverable'

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
        type: 'video',
        assignee: null,
        status: 'approved',
        due_date: null,
        brief: null,
      }),
    ).toEqual({
      id: 'd',
      name: 'Walk',
      type: 'video',
      assignee: null,
      status: 'approved',
      dueDate: '',
      brief: '',
    })
  })
})

describe('deliverablesLabel', () => {
  it('counts in singular and plural', () => {
    expect(deliverablesLabel(1)).toBe('1 deliverable')
    expect(deliverablesLabel(6)).toBe('6 deliverables')
  })
})

describe('dueHint', () => {
  const today = new Date(2024, 8, 18)

  it('reads the due date against today', () => {
    expect(dueHint('2024-09-18', today)).toEqual({ label: 'Today', urgent: true })
    expect(dueHint('2024-09-19', today)).toEqual({ label: 'Tomorrow', urgent: false })
    expect(dueHint('2024-09-22', today)).toEqual({ label: 'In 4 days', urgent: false })
    expect(dueHint('2024-09-17', today)).toEqual({ label: '1 day overdue', urgent: true })
    expect(dueHint('2024-09-10', today)).toEqual({ label: '8 days overdue', urgent: true })
    expect(dueHint('', today)).toBeNull()
  })

  it('counts days across a month', () => {
    expect(dueHint('2024-10-01', today)?.label).toBe('In 13 days')
  })
})
