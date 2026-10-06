import * as v from 'valibot'
import { assigneeOptions, deliverableSchema } from './add-deliverable-form'

describe('deliverableSchema', () => {
  it('needs a name and trims the text', () => {
    const empty = v.safeParse(deliverableSchema, { name: '  ', brief: '' })
    expect(v.flatten(empty.issues!).nested).toEqual({ name: ['Enter the deliverable.'] })

    const filled = v.safeParse(deliverableSchema, { name: ' Walk ', brief: ' Slow ' })
    expect(filled.output).toEqual({ name: 'Walk', brief: 'Slow' })
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
