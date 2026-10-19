import { toRequest } from './deliverable-draft'

describe('toRequest', () => {
  it('sends the assignee id and empty fields as null', () => {
    expect(
      toRequest({
        id: 'd',
        name: 'Walk',
        type: 'video',
        assignee: { id: 'ad-1', name: 'Amina', photo_url: null },
        status: 'to_shoot',
        shoots: 0,
        dueDate: '',
        brief: '',
      }),
    ).toEqual({
      name: 'Walk',
      type: 'video',
      assignee_id: 'ad-1',
      due_date: null,
      brief: null,
    })
  })
})
