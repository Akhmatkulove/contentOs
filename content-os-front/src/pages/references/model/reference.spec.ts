import type { Schemas } from '@/shared/api'
import { toReference } from './reference'

type File = Schemas['FileResponse']

const image = (id: string): File => ({
  id,
  kind: 'image',
  content_type: 'image/webp',
  url: `https://signed/${id}`,
})
const video = (id: string): File => ({ id, kind: 'video', content_type: 'video/mp4', url: '' })

function response(overrides: Partial<Schemas['ReferenceResponse']> = {}) {
  return {
    id: 'r1',
    title: 'Beach light',
    type: null,
    link: null,
    collection: 'Summer 26',
    notes: null,
    tags: ['light'],
    product_id: 'p1',
    author: 'Acme',
    files: [],
    created_at: '2026-10-06T10:00:00Z',
    ...overrides,
  } satisfies Schemas['ReferenceResponse']
}

describe('toReference', () => {
  it('previews the first image and counts files by kind', () => {
    expect(toReference(response({ files: [video('v'), image('a'), image('b')] }))).toEqual({
      id: 'r1',
      title: 'Beach light',
      kind: 'video',
      author: 'Acme',
      previewUrl: 'https://signed/a',
      durationSec: null,
      imageCount: 2,
      videoCount: 1,
      tags: ['light'],
      favorite: false,
    })
  })

  it('names an untitled link by its host', () => {
    const card = toReference(response({ title: null, link: 'https://www.instagram.com/p/x/' }))
    expect(card).toMatchObject({ title: 'instagram.com', kind: 'image', previewUrl: null })
    expect(card.imageCount + card.videoCount).toBe(0)
  })

  it('takes the kind from the type', () => {
    expect(toReference(response({ type: 'video', files: [image('a')] })).kind).toBe('video')
  })
})
