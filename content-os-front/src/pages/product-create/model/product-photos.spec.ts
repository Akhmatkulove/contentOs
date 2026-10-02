import { effectScope } from 'vue'
import { newPhotos, rejectedPhotosMessage, useProductPhotos } from './product-photos'

const file = (name: string, lastModified = 1) =>
  new File(['x'], name, { type: 'image/png', lastModified })

describe('newPhotos', () => {
  it('skips files already added or repeated in the same pick', () => {
    const a = file('a.png')
    expect(
      newPhotos([a], [file('a.png'), file('b.png'), file('b.png')]).map((f) => f.name),
    ).toEqual(['b.png'])
    expect(newPhotos([a], [file('a.png', 2)])).toHaveLength(1)
  })
})

describe('rejectedPhotosMessage', () => {
  it('counts rejected files', () => {
    expect(rejectedPhotosMessage(1)).toBe('This file is not an image.')
    expect(rejectedPhotosMessage(3)).toBe('3 files are not images.')
  })
})

describe('useProductPhotos', () => {
  beforeEach(() => {
    let n = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++n}`)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('adds previews, removes them and frees the URLs', () => {
    const scope = effectScope()
    const { photos, addPhotos, removePhoto } = scope.run(() => useProductPhotos())!

    addPhotos([file('a.png'), file('b.png')])
    expect(photos.value.map((p) => p.url)).toEqual(['blob:1', 'blob:2'])

    removePhoto(photos.value[0]!.id)
    expect(photos.value.map((p) => p.file.name)).toEqual(['b.png'])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')

    scope.stop()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  })
})
