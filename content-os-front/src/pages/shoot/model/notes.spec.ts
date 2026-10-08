import * as v from 'valibot'
import type { ShootNote } from '../api/notes'
import { noteSchema } from './note-form'
import { findNotes, noteLines } from './notes'

const member = (id: string, name: string) => ({ id, name, photo_url: null })

const note = (overrides: Partial<ShootNote>): ShootNote => ({
  id: 'n1',
  title: 'Studio reminders',
  type: 'logistics',
  visibility: 'internal',
  body: 'Arrive early',
  pinned: false,
  author: member('amina', 'Amina'),
  assignees: [],
  created_at: '2024-09-17T16:20:00Z',
  can_manage: true,
  ...overrides,
})

describe('noteLines', () => {
  it('makes a bullet of each non-empty line, dropping typed bullets', () => {
    expect(noteLines('- Keep it clean\n\n• Soft light\n  Cover all products  ')).toEqual([
      'Keep it clean',
      'Soft light',
      'Cover all products',
    ])
  })
})

describe('findNotes', () => {
  const notes = [
    note({}),
    note({ id: 'n2', title: 'Creative reminder', type: 'creative', pinned: true }),
    note({ id: 'n3', title: 'Feedback', type: 'feedback', author: member('lana', 'Lana') }),
  ]
  const ids = (search: string, filter: Parameters<typeof findNotes>[2]) =>
    findNotes(notes, search, filter).map((item) => item.id)

  it('searches titles, text and authors', () => {
    expect(ids('lana', 'all')).toEqual(['n3'])
    expect(ids('early', 'all')).toEqual(['n1', 'n2', 'n3'])
  })
  it('filters pinned notes or a type', () => {
    expect(ids('', 'pinned')).toEqual(['n2'])
    expect(ids('', 'feedback')).toEqual(['n3'])
  })
})

describe('noteSchema', () => {
  it('needs a title and a text', () => {
    const result = v.safeParse(noteSchema, { title: '  ', body: '' })
    expect(result.issues?.map((issue) => issue.message)).toEqual([
      'Enter a title.',
      'Write the note.',
    ])
    expect(v.safeParse(noteSchema, { title: 'Hi', body: 'Text' }).success).toBe(true)
  })
})
