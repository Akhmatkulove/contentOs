import { rejectedPhotosMessage } from './product-photos'

describe('rejectedPhotosMessage', () => {
  it('counts rejected files', () => {
    expect(rejectedPhotosMessage(1)).toBe('This file is not an image.')
    expect(rejectedPhotosMessage(3)).toBe('3 files are not images.')
  })
})
