import { describe, expect, it } from 'vitest'
import type { Schemas } from '@/shared/api'
import { formatDuration, linkHost, toReference } from './reference'

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [28, '0:28'],
    [65, '1:05'],
    [3725, '1:02:05'],
    [28.9, '0:28'],
    [-5, '0:00'],
  ])('%d → %s', (sec, expected) => {
    expect(formatDuration(sec)).toBe(expected)
  })
})

describe('linkHost', () => {
  it('names a link by its host', () => {
    expect(linkHost('https://www.instagram.com/p/abc/')).toBe('instagram.com')
    expect(linkHost('not a url')).toBe('not a url')
  })
})

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
    author_id: 'u1',
    author: 'Acme',
    files: [],
    favorite: false,
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
