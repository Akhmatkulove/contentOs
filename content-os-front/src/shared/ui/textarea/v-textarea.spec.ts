import { mount } from '@vue/test-utils'
import VTextarea from './v-textarea.vue'

describe('VTextarea', () => {
  it('links the label to the textarea', () => {
    const wrapper = mount(VTextarea, { props: { label: 'About' } })
    const id = wrapper.find('textarea').attributes('id')
    expect(id).toBeTruthy()
    expect(wrapper.find('label').attributes('for')).toBe(id)
  })

  it('supports v-model', async () => {
    const wrapper = mount(VTextarea, {
      props: {
        modelValue: 'a',
        'onUpdate:modelValue': (value?: string) => wrapper.setProps({ modelValue: value }),
      },
    })
    expect(wrapper.find('textarea').element.value).toBe('a')
    await wrapper.find('textarea').setValue('line 1\nline 2')
    expect(wrapper.props('modelValue')).toBe('line 1\nline 2')
  })

  it('passes attributes to the textarea and class to the root', () => {
    const wrapper = mount(VTextarea, {
      props: { class: 'mt-4', rows: 2 },
      attrs: { placeholder: 'Enter notes', maxlength: 500 },
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toBe('Enter notes')
    expect(textarea.attributes('maxlength')).toBe('500')
    expect(textarea.attributes('rows')).toBe('2')
    expect(wrapper.classes()).toContain('mt-4')
    expect(textarea.classes()).not.toContain('mt-4')
  })

  it('shows the error and marks the textarea invalid', () => {
    const wrapper = mount(VTextarea, { props: { error: 'This field is required.' } })
    const textarea = wrapper.find('textarea')
    const message = wrapper.find('p')
    expect(message.text()).toBe('This field is required.')
    expect(textarea.attributes('aria-invalid')).toBe('true')
    expect(textarea.attributes('aria-describedby')).toBe(message.attributes('id'))
  })
})
