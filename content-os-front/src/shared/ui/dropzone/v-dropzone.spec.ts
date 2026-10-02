import { mount } from '@vue/test-utils'
import VDropzone from './v-dropzone.vue'

const png = new File(['x'], 'a.png', { type: 'image/png' })
const pdf = new File(['x'], 'b.pdf', { type: 'application/pdf' })

function drop(files: File[]) {
  return { dataTransfer: { files } }
}

describe('VDropzone', () => {
  it('emits picked files from the input', async () => {
    const wrapper = mount(VDropzone, { props: { accept: 'image/*' } })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [png], configurable: true })
    await input.trigger('change')
    expect(wrapper.emitted('select')).toEqual([[[png]]])
  })

  it('splits dropped files into accepted and rejected', async () => {
    const wrapper = mount(VDropzone, { props: { accept: 'image/*' } })
    await wrapper.trigger('drop', drop([png, pdf]))
    expect(wrapper.emitted('select')).toEqual([[[png]]])
    expect(wrapper.emitted('reject')).toEqual([[[pdf]]])
  })

  it('highlights while files are dragged over', async () => {
    const wrapper = mount(VDropzone)
    await wrapper.trigger('dragenter')
    expect(wrapper.classes()).toContain('bg-status-accent')
    await wrapper.trigger('dragleave')
    expect(wrapper.classes()).not.toContain('bg-status-accent')
  })

  it('ignores drops when disabled', async () => {
    const wrapper = mount(VDropzone, { props: { disabled: true } })
    await wrapper.trigger('drop', drop([png]))
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
