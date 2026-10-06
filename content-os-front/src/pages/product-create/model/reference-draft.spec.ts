import { draftCard, previewFile, toRequest, type ReferenceDraft } from './reference-draft'

const image = new File(['x'], 'beach.jpg', { type: 'image/jpeg' })
const video = new File(['x'], 'walk.mp4', { type: 'video/mp4' })

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

describe('draftCard', () => {
  it('falls back to the file name or the link host for the title', () => {
    expect(draftCard(draft(), 'Acme', 'blob:1')).toMatchObject({
      title: 'beach.jpg',
      kind: 'image',
      author: 'Acme',
      previewUrl: 'blob:1',
      fileCount: 1,
    })
    const link = draft({ source: 'link', files: [], link: 'https://www.instagram.com/p/1' })
    expect(draftCard(link, 'Acme', null)).toMatchObject({ title: 'instagram.com', fileCount: null })
  })

  it('shows a video when the first file is one', () => {
    expect(draftCard(draft({ files: [video, image] }), 'Acme', null).kind).toBe('video')
  })
})

describe('previewFile', () => {
  it('takes the first image, skipping videos', () => {
    expect(previewFile(draft({ files: [video, image] }))).toBe(image)
    expect(previewFile(draft({ files: [video] }))).toBeUndefined()
  })
})
