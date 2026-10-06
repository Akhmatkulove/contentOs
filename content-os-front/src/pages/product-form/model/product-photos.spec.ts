import { photoIds, rejectedPhotosMessage, type PhotoEntry } from './product-photos'

describe('rejectedPhotosMessage', () => {
  it('counts rejected files', () => {
    expect(rejectedPhotosMessage(1)).toBe('This file is not a JPEG, PNG or WebP image.')
    expect(rejectedPhotosMessage(3)).toBe('3 files are not JPEG, PNG or WebP images.')
  })
})

describe('photoIds', () => {
  it('keeps saved photos and gives new ones the uploaded ids, in the form order', () => {
    const file = new File(['x'], 'a.jpg')
    const photos: PhotoEntry[] = [
      { id: 'saved-1', url: 'https://s/1', name: 'Photo 1', file: null },
      { id: 'local-1', url: 'blob:1', name: 'a.jpg', file },
      { id: 'saved-2', url: 'https://s/2', name: 'Photo 2', file: null },
      { id: 'local-2', url: 'blob:2', name: 'b.jpg', file },
    ]
    expect(photoIds(photos, ['up-1', 'up-2'])).toEqual(['saved-1', 'up-1', 'saved-2', 'up-2'])
  })
})
