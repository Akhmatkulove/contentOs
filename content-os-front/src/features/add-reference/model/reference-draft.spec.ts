import { toRequest, type ReferenceDraft } from './reference-draft'

const image = new File(['x'], 'beach.jpg', { type: 'image/jpeg' })

function draft(overrides: Partial<ReferenceDraft> = {}): ReferenceDraft {
  return {
    id: 'd1',
    source: 'upload',
    files: [image],
    link: '',
    title: '',
    type: undefined,
    tags: [],
    notes: '',
    productId: undefined,
    collection: '',
    favorite: false,
    ...overrides,
  }
}

describe('toRequest', () => {
  it('sends uploaded file ids for files and the link for a link', () => {
    expect(toRequest(draft({ title: 'Beach', tags: ['sun'] }), ['f1'])).toEqual({
      title: 'Beach',
      type: null,
      tags: ['sun'],
      notes: null,
      file_ids: ['f1'],
    })
    expect(
      toRequest(draft({ source: 'link', files: [], link: 'https://x.com/p/1' }), []),
    ).toMatchObject({ link: 'https://x.com/p/1' })
  })
})
