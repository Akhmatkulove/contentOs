import { mount } from '@vue/test-utils'
import VUploadThumbnail from './v-upload-thumbnail.vue'

describe('VUploadThumbnail', () => {
  it('shows the image and emits remove', async () => {
    const wrapper = mount(VUploadThumbnail, { props: { src: 'blob:1', alt: 'look.jpg' } })
    expect(wrapper.get('img').attributes('src')).toBe('blob:1')
    expect(wrapper.find('[data-video-badge]').exists()).toBe(false)
    await wrapper.get('button[aria-label="Remove look.jpg"]').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('emits load when the preview is ready or fails', async () => {
    const image = mount(VUploadThumbnail, { props: { src: 'blob:1' } })
    expect(image.find('[data-loading]').exists()).toBe(true)
    await image.get('img').trigger('load')
    expect(image.emitted('load')).toHaveLength(1)
    expect(image.find('[data-loading]').exists()).toBe(false)

    const video = mount(VUploadThumbnail, { props: { src: 'blob:2', video: true } })
    await video.get('video').trigger('loadeddata')
    await video.get('video').trigger('error')
    expect(video.emitted('load')).toHaveLength(2)
  })

  it('previews a video by its first frame', () => {
    const wrapper = mount(VUploadThumbnail, {
      props: { src: 'blob:2', alt: 'walk.mp4', video: true },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('video').attributes('src')).toBe('blob:2#t=0.1')
    expect(wrapper.get('[data-video-badge] use').attributes('href')).toMatch(/#video-01$/)
  })
})
