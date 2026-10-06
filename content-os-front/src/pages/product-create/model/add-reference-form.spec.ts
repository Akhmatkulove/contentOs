import { effectScope, nextTick } from 'vue'
import {
  referenceErrors,
  rejectedFilesMessage,
  typeForFiles,
  useAddReferenceForm,
} from './add-reference-form'

const image = () => new File(['i'], 'a.jpg', { type: 'image/jpeg' })
const video = () => new File(['v'], 'a.mp4', { type: 'video/mp4' })

describe('rejectedFilesMessage', () => {
  it('counts rejected files', () => {
    expect(rejectedFilesMessage(1)).toBe('This file is not an image or a video.')
    expect(rejectedFilesMessage(2)).toBe('2 files are not images or videos.')
  })
})

describe('typeForFiles', () => {
  it('picks the type from the files', () => {
    expect(typeForFiles([])).toBeUndefined()
    expect(typeForFiles([image()])).toBe('image')
    expect(typeForFiles([video()])).toBe('video')
    expect(typeForFiles([video(), video()])).toBe('video')
    expect(typeForFiles([image(), image()])).toBe('image')
    expect(typeForFiles([image(), video()])).toBe('moodboard')
  })
})

describe('useAddReferenceForm', () => {
  it('sets the type from the files until the user picks one', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const scope = effectScope()
    const { form, addFiles, chooseType } = scope.run(() => useAddReferenceForm())!

    addFiles([video()])
    await nextTick()
    expect(form.type).toBe('video')
    addFiles([image()])
    await nextTick()
    expect(form.type).toBe('moodboard')

    chooseType('image')
    addFiles([video()])
    await nextTick()
    expect(form.type).toBe('image')
    scope.stop()
  })

  it('starts on upload and clears the link with its preview', () => {
    const scope = effectScope()
    const { source, form, linkPreview, removeLink } = scope.run(() => useAddReferenceForm())!
    expect(source.value).toBe('upload')

    form.link = 'https://www.instagram.com/p/abc'
    linkPreview.value = {
      title: 'Walking transition',
      thumbnail: 'https://cdn.test/thumb.jpg',
      source: 'Instagram · Video',
      sourceIcon: 'instagram',
      video: true,
    }
    removeLink()
    expect(form.link).toBe('')
    expect(linkPreview.value).toBeNull()
    scope.stop()
  })
})

describe('useAddReferenceForm loading', () => {
  it('waits for every preview before it adds the reference', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const scope = effectScope()
    const { files, addFiles, loading, markLoaded, submit } = scope.run(() => useAddReferenceForm())!
    expect(loading.value).toBe(false)

    addFiles([image(), video()])
    expect(loading.value).toBe(true)
    expect(submit()).toBeNull()

    files.value.forEach((item) => markLoaded(item.id))
    expect(loading.value).toBe(false)
    expect(submit()?.files).toHaveLength(2)
    scope.stop()
  })
})

describe('referenceErrors', () => {
  it('needs files for an upload', () => {
    expect(referenceErrors('upload', 0, '')).toEqual({ files: 'Add at least one file.', link: '' })
    expect(referenceErrors('upload', 2, '')).toEqual({ files: '', link: '' })
  })

  it('needs an http(s) link for a link', () => {
    expect(referenceErrors('link', 0, ' ').link).toBe('Paste a link.')
    expect(referenceErrors('link', 0, 'instagram').link).toBe('Enter a valid link.')
    expect(referenceErrors('link', 0, 'ftp://example.com/a').link).toBe(
      'Enter a link starting with http:// or https://.',
    )
    expect(referenceErrors('link', 0, ' https://example.com/a ').link).toBe('')
  })
})
