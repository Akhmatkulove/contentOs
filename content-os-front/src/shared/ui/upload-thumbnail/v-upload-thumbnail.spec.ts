import { mount } from '@vue/test-utils'
import VUploadThumbnail from './v-upload-thumbnail.vue'

describe('VUploadThumbnail', () => {
  it('shows the image and emits remove', async () => {
    const wrapper = mount(VUploadThumbnail, { props: { src: 'blob:1', alt: 'look.jpg' } })
    expect(wrapper.get('img').attributes('src')).toBe('blob:1')
    await wrapper.get('button[aria-label="Remove look.jpg"]').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
