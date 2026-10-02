import { effectScope } from 'vue'
import { newFiles, usePickedFiles } from './picked-files'

const file = (name: string, lastModified = 1) =>
  new File(['x'], name, { type: 'image/png', lastModified })

describe('newFiles', () => {
  it('skips files already added or repeated in the same pick', () => {
    const a = file('a.png')
    expect(newFiles([a], [file('a.png'), file('b.png'), file('b.png')]).map((f) => f.name)).toEqual(
      ['b.png'],
    )
    expect(newFiles([a], [file('a.png', 2)])).toHaveLength(1)
  })
})

describe('usePickedFiles', () => {
  beforeEach(() => {
    let n = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++n}`)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('adds previews, removes them and frees the URLs', () => {
    const scope = effectScope()
    const { files, add, remove } = scope.run(() => usePickedFiles())!

    add([file('a.png'), file('b.png')])
    expect(files.value.map((p) => p.url)).toEqual(['blob:1', 'blob:2'])

    remove(files.value[0]!.id)
    expect(files.value.map((p) => p.file.name)).toEqual(['b.png'])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')

    scope.stop()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  })
})
