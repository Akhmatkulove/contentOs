import { mount } from '@vue/test-utils'
import VInput from './v-input.vue'

describe('VInput', () => {
  it('links the label to the input', () => {
    const wrapper = mount(VInput, { props: { label: 'Product name' } })
    const id = wrapper.find('input').attributes('id')
    expect(id).toBeTruthy()
    expect(wrapper.find('label').attributes('for')).toBe(id)
  })

  it('supports v-model', async () => {
    const wrapper = mount(VInput, {
      props: {
        modelValue: 'a',
        'onUpdate:modelValue': (value?: string) => wrapper.setProps({ modelValue: value }),
      },
    })
    expect(wrapper.find('input').element.value).toBe('a')
    await wrapper.find('input').setValue('b')
    expect(wrapper.props('modelValue')).toBe('b')
  })

  it('passes attributes to the input and class to the root', () => {
    const wrapper = mount(VInput, {
      props: { class: 'mt-4' },
      attrs: { placeholder: 'Type', disabled: true },
    })
    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Type')
    expect(input.element.disabled).toBe(true)
    expect(wrapper.classes()).toContain('mt-4')
    expect(input.classes()).not.toContain('mt-4')
  })

  it('shows the error and marks the input invalid', () => {
    const wrapper = mount(VInput, { props: { error: 'This field is required.' } })
    const input = wrapper.find('input')
    const message = wrapper.find('p')
    expect(message.text()).toBe('This field is required.')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(message.attributes('id'))
  })

  it('has no error markup without an error', () => {
    const wrapper = mount(VInput)
    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('marks a required field without the native attribute', () => {
    const wrapper = mount(VInput, { props: { label: 'About', required: true } })
    const field = wrapper.find('input')
    expect(wrapper.find('label').text()).toBe('About *')
    expect(field.attributes('aria-required')).toBe('true')
    expect(field.attributes('required')).toBeUndefined()
  })

  it('leaves an optional field unmarked', () => {
    const wrapper = mount(VInput, { props: { label: 'About' } })
    expect(wrapper.find('label').text()).toBe('About')
    expect(wrapper.find('input').attributes('aria-required')).toBeUndefined()
  })
})
