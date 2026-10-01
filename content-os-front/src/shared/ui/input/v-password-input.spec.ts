import { mount } from '@vue/test-utils'
import VPasswordInput from './v-password-input.vue'

describe('VPasswordInput', () => {
  it('toggles password visibility', async () => {
    const wrapper = mount(VPasswordInput, { props: { label: 'Password' } })
    const input = wrapper.find('input')
    const toggle = wrapper.find('button')

    expect(input.attributes('type')).toBe('password')
    expect(toggle.attributes('type')).toBe('button')
    expect(toggle.attributes('aria-pressed')).toBe('false')

    await toggle.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(toggle.attributes('aria-pressed')).toBe('true')
  })

  it('passes attributes and v-model through to the input', async () => {
    const wrapper = mount(VPasswordInput, {
      props: {
        modelValue: '',
        'onUpdate:modelValue': (value?: string) => wrapper.setProps({ modelValue: value }),
      },
      attrs: { autocomplete: 'current-password' },
    })
    const input = wrapper.find('input')
    expect(input.attributes('autocomplete')).toBe('current-password')
    await input.setValue('secret')
    expect(wrapper.props('modelValue')).toBe('secret')
  })
})
