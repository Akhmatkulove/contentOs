import { rejectedPhotosMessage } from './product-photos'

describe('rejectedPhotosMessage', () => {
  it('counts rejected files', () => {
    expect(rejectedPhotosMessage(1)).toBe('This file is not a JPEG, PNG or WebP image.')
    expect(rejectedPhotosMessage(3)).toBe('3 files are not JPEG, PNG or WebP images.')
  })
})
