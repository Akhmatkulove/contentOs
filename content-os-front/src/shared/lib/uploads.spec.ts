import { MAX_IMAGE_BYTES, tooLarge, tooLargeMessage, uploadAll } from './uploads'

function file(type: string, size: number) {
  const f = new File(['x'], 'f', { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('tooLarge', () => {
  it('allows bigger videos than images', () => {
    expect(tooLarge(file('image/jpeg', MAX_IMAGE_BYTES))).toBe(false)
    expect(tooLarge(file('image/jpeg', MAX_IMAGE_BYTES + 1))).toBe(true)
    expect(tooLarge(file('video/mp4', MAX_IMAGE_BYTES + 1))).toBe(false)
  })

  it('counts files in the message', () => {
    expect(tooLargeMessage(1)).toMatch(/^This file is too large/)
    expect(tooLargeMessage(2)).toMatch(/^2 files are too large/)
  })
})

describe('uploadAll', () => {
  it('keeps the order and runs at most `limit` uploads at once', async () => {
    const files = ['a', 'b', 'c', 'd', 'e'].map((name) => new File(['x'], name))
    let running = 0
    let peak = 0
    const upload = async (f: File) => {
      running++
      peak = Math.max(peak, running)
      // Later files finish first: the order must still follow the input.
      await new Promise((resolve) => setTimeout(resolve, 10 - files.indexOf(f)))
      running--
      return f.name
    }

    expect(await uploadAll(files, upload, 2)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(peak).toBe(2)
  })

  it('fails as a whole when one upload fails', async () => {
    const files = [new File(['x'], 'a'), new File(['x'], 'b')]
    const upload = async (f: File) => {
      if (f.name === 'b') throw new Error('boom')
      return f.name
    }

    await expect(uploadAll(files, upload)).rejects.toThrow('boom')
  })
})
