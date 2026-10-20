import type { ContentComment, ContentMaterial } from '../api/content'
import {
  calendarDate,
  commentFeed,
  contentSubtitle,
  deliverableHint,
  rail,
  referenceHint,
  sendsOnKey,
  shootRoleLabel,
  startIndex,
} from './content-details'

function material(id: string, kind: 'image' | 'video' = 'image'): ContentMaterial {
  return {
    id,
    author_id: 'u1',
    file: { id: `f-${id}`, kind, content_type: 'image/webp', url: `https://s/${id}` },
  }
}

function comment(id: string, at: string): ContentComment {
  return {
    id,
    author: { id: 'u1', name: 'Acme', photo_url: null },
    role: 'brand',
    body: 'Hi',
    created_at: at,
  }
}

describe('rail', () => {
  it('shows up to five files, then four and "+N" for the rest', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => material(id))
    expect(rail(five)).toEqual({ shown: five, more: 0 })
    const seven = [...five, material('f'), material('g')]
    expect(rail(seven)).toEqual({ shown: seven.slice(0, 4), more: 3 })
  })
})

describe('startIndex', () => {
  it('opens on the file tapped in the list, else on the first', () => {
    const files = [material('a'), material('b')]
    expect(startIndex(files, 'b')).toBe(1)
    expect(startIndex(files, 'gone')).toBe(0)
    expect(startIndex(files, undefined)).toBe(0)
  })
})

describe('labels', () => {
  it('names the shoot role, the deliverable and the subtitle', () => {
    expect(shootRoleLabel('mobilographer')).toBe('Mobilographer')
    expect(shootRoleLabel(null)).toBe('Creator')
    expect(deliverableHint({ type: 'video', materials: [material('a')] })).toBe('Video · 1 file')
    expect(calendarDate('2024-09-18')).toBe('Sep 18, 2024')
    const product = { id: 'p1', name: 'Cream Dress 011', photo: null }
    expect(contentSubtitle({ product, shoot: null })).toEqual(['Cream Dress 011'])
    expect(
      contentSubtitle({
        product,
        shoot: { id: 's1', name: 'Shoot 04', date: '2024-09-18', location: null },
      }),
    ).toEqual(['Cream Dress 011', 'Shoot 04'])
  })
})

describe('commentFeed', () => {
  const newer = comment('c2', '2024-09-18T14:45:00Z')
  const older = comment('c1', '2024-09-18T13:50:00Z')

  it('puts the approval where it happened, newest first', () => {
    const feed = commentFeed([newer, older], '2024-09-18T14:00:00Z')
    expect(feed.map((entry) => entry.key)).toEqual(['c2', 'approved', 'c1'])
  })

  it('puts it first or last when it is the newest or the oldest', () => {
    expect(commentFeed([newer], '2024-09-19T00:00:00Z').map((e) => e.key)).toEqual([
      'approved',
      'c2',
    ])
    expect(commentFeed([newer], '2024-09-01T00:00:00Z').map((e) => e.key)).toEqual([
      'c2',
      'approved',
    ])
    expect(commentFeed([], null)).toEqual([])
  })
})

describe('sendsOnKey', () => {
  it('sends on Enter, not on Shift+Enter or while composing', () => {
    expect(sendsOnKey({ key: 'Enter', shiftKey: false, isComposing: false })).toBe(true)
    expect(sendsOnKey({ key: 'Enter', shiftKey: true, isComposing: false })).toBe(false)
    expect(sendsOnKey({ key: 'Enter', shiftKey: false, isComposing: true })).toBe(false)
    expect(sendsOnKey({ key: 'a', shiftKey: false, isComposing: false })).toBe(false)
  })
})

describe('referenceHint', () => {
  const base = {
    id: 'r1',
    title: null,
    type: null,
    link: null,
    collection: null,
    notes: null,
    tags: [],
    product_id: null,
    author_id: 'u1',
    author: null,
    favorite: false,
    created_at: '2024-09-18T12:00:00Z',
  }

  it('names the kind and the count, or where a link leads', () => {
    const file = material('a').file
    expect(referenceHint({ ...base, files: [file] })).toBe('Image reference')
    expect(referenceHint({ ...base, files: [file, file] })).toBe('Image reference · 2 files')
    expect(referenceHint({ ...base, files: [], link: 'https://www.instagram.com/p/1' })).toBe(
      'instagram.com',
    )
  })
})
