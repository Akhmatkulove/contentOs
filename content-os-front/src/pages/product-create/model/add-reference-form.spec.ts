import { effectScope } from 'vue'
import { rejectedFilesMessage, useAddReferenceForm } from './add-reference-form'

describe('rejectedFilesMessage', () => {
  it('counts rejected files', () => {
    expect(rejectedFilesMessage(1)).toBe('This file is not an image or a video.')
    expect(rejectedFilesMessage(2)).toBe('2 files are not images or videos.')
  })
})

describe('useAddReferenceForm', () => {
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
