import { formatDueDate, toRequest } from './deliverable-draft'

describe('formatDueDate', () => {
  it('shows the day as in Figma, without a timezone shift', () => {
    expect(formatDueDate('2024-09-18')).toBe('Sep 18, 2024')
    expect(formatDueDate('2024-01-01')).toBe('Jan 1, 2024')
  })

  it('is empty without a date', () => {
    expect(formatDueDate('')).toBe('')
  })
})

describe('toRequest', () => {
  it('sends the assignee id and empty fields as null', () => {
    expect(
      toRequest({
        id: 'd',
        name: 'Walk',
        assignee: { id: 'ad-1', name: 'Amina', photo_url: null },
        status: 'approved',
        dueDate: '',
        brief: '',
      }),
    ).toEqual({
      name: 'Walk',
      assignee_id: 'ad-1',
      status: 'approved',
      due_date: null,
      brief: null,
    })
  })
})
