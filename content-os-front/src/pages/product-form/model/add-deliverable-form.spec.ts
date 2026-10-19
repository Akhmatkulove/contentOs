import * as v from 'valibot'
import { assigneeOptions, deliverableSchema } from './add-deliverable-form'

describe('deliverableSchema', () => {
  it('needs a name, a type and an assignee', () => {
    const empty = v.safeParse(deliverableSchema, {
      name: '  ',
      type: undefined,
      assigneeId: undefined,
      brief: '',
    })
    expect(v.flatten(empty.issues!).nested).toEqual({
      name: ['Enter the deliverable.'],
      type: ['Select a type.'],
      assigneeId: ['Select an assignee.'],
    })
  })

  it('trims the text', () => {
    const filled = v.safeParse(deliverableSchema, {
      name: ' Walk ',
      type: 'video',
      assigneeId: 'a',
      brief: ' Slow ',
    })
    expect(filled.output).toEqual({ name: 'Walk', type: 'video', assigneeId: 'a', brief: 'Slow' })
  })
})

describe('assigneeOptions', () => {
  it('lists art directors by id and name', () => {
    expect(
      assigneeOptions([
        { id: 'a', name: 'Amina', photo_url: null },
        { id: 'b', name: null, photo_url: null },
      ]),
    ).toEqual([
      { value: 'a', label: 'Amina' },
      { value: 'b', label: 'Unnamed' },
    ])
  })
})
