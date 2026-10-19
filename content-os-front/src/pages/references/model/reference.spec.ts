import type { ReferenceDetails } from '../api/references'
import {
  dealColumns,
  filesLabel,
  galleryColumns,
  linkIcon,
  referenceFacts,
  referenceTitle,
  type ReferenceFile,
} from './reference'

const image = { id: 'f1', kind: 'image', content_type: 'image/webp', url: 'https://s/1' } as const
const video = { id: 'f2', kind: 'video', content_type: 'video/mp4', url: 'https://s/2' } as const

const reference: ReferenceDetails = {
  id: 'r1',
  title: 'Beach light',
  type: 'moodboard',
  link: null,
  collection: 'Summer 26',
  notes: null,
  tags: [],
  product_id: null,
  author_id: 'u1',
  author: 'Amina',
  files: [image, video],
  favorite: false,
  created_at: '2026-10-19T12:00:00Z',
}

describe('referenceTitle', () => {
  it('names an untitled link by its site', () => {
    expect(referenceTitle(reference)).toBe('Beach light')
    expect(
      referenceTitle({ ...reference, title: null, link: 'https://www.instagram.com/p/x/' }),
    ).toBe('instagram.com')
    expect(referenceTitle({ ...reference, title: null })).toBe('Untitled')
  })
})

describe('filesLabel', () => {
  it('counts files by kind', () => {
    expect(filesLabel([image, video, { ...image, id: 'f3' }])).toBe('2 images · 1 video')
    expect(filesLabel([video])).toBe('1 video')
    expect(filesLabel([])).toBe('Link')
  })
})

describe('referenceFacts', () => {
  it('lists only the facts with a value', () => {
    expect(referenceFacts(reference).map((fact) => fact.label)).toEqual([
      'Type',
      'Content',
      'Creator',
      'Collection',
      'Added',
    ])
    const bare = referenceFacts({ ...reference, type: null, collection: null, author: null })
    expect(bare.map((fact) => fact.label)).toEqual(['Content', 'Added'])
  })
})

describe('linkIcon', () => {
  it('picks the icon of a known site', () => {
    expect(linkIcon('https://www.instagram.com/p/abc/')).toBe('instagram')
    expect(linkIcon('https://vm.tiktok.com/x')).toBe('tiktok')
    expect(linkIcon('https://pin.it/abc')).toBe('pinterest')
    expect(linkIcon('https://notinstagram.com/')).toBe('link-01')
  })
})

describe('galleryColumns', () => {
  it('fits columns of at least 300px, up to three', () => {
    expect(galleryColumns(343, 10, 12)).toBe(1)
    expect(galleryColumns(800, 10, 20)).toBe(2)
    expect(galleryColumns(1400, 10, 20)).toBe(3)
  })

  it('never makes more columns than files', () => {
    expect(galleryColumns(1400, 2, 20)).toBe(2)
    expect(galleryColumns(1400, 1, 20)).toBe(1)
  })
})

describe('dealColumns', () => {
  it('deals files row by row and keeps their order', () => {
    const files: ReferenceFile[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ ...image, id }))
    const columns = dealColumns(files, 2)
    expect(columns.map((column) => column.map(({ item }) => item.id))).toEqual([
      ['a', 'c', 'e'],
      ['b', 'd'],
    ])
    expect(columns[1]!.map(({ index }) => index)).toEqual([1, 3])
  })
})
