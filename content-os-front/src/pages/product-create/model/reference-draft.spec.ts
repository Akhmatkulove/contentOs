import type { ReferenceDraft } from '@/features/add-reference'
import { draftCard, previewFile } from './reference-draft'

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
    productId: undefined,
    collection: '',
    favorite: false,
    ...overrides,
  }
}

describe('draftCard', () => {
  it('falls back to the file name or the link host for the title', () => {
    expect(draftCard(draft(), 'Acme', 'blob:1')).toMatchObject({
      title: 'beach.jpg',
      kind: 'image',
      author: 'Acme',
      previewUrl: 'blob:1',
      imageCount: 1,
      videoCount: 0,
    })
    const link = draft({ source: 'link', files: [], link: 'https://www.instagram.com/p/1' })
    expect(draftCard(link, 'Acme', null)).toMatchObject({
      title: 'instagram.com',
      imageCount: 0,
      videoCount: 0,
    })
  })

  it('shows a video when the first file is one', () => {
    expect(draftCard(draft({ files: [video, image] }), 'Acme', null).kind).toBe('video')
  })

  it('counts images and videos apart', () => {
    expect(draftCard(draft({ files: [video, image, image] }), 'Acme', null)).toMatchObject({
      imageCount: 2,
      videoCount: 1,
    })
  })
})

describe('previewFile', () => {
  it('takes the first image, skipping videos', () => {
    expect(previewFile(draft({ files: [video, image] }))).toBe(image)
    expect(previewFile(draft({ files: [video] }))).toBeUndefined()
  })
})
