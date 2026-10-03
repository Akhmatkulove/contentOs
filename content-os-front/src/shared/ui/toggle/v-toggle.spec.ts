import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import VToggle from './v-toggle.vue'

function mountToggle(props: { modelValue?: boolean; disabled?: boolean } = {}) {
  const wrapper = mount(VToggle, {
    props: {
      modelValue: false,
      'onUpdate:modelValue': (value: boolean): void => {
        void wrapper.setProps({ modelValue: value })
      },
      ...props,
    },
  })
  return wrapper
}

describe('VToggle', () => {
  it('is a switch that flips on click', async () => {
    const wrapper = mountToggle()
    const button = wrapper.get('button')
    expect(button.attributes('role')).toBe('switch')
    expect(button.attributes('aria-checked')).toBe('false')

    await button.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(button.attributes('aria-checked')).toBe('true')
  })

  it('does not flip while disabled', async () => {
    const wrapper = mountToggle({ disabled: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('flips from its <label>', async () => {
    const on = ref(false)
    const wrapper = mount(
      defineComponent(() => () => [
        h(VToggle, {
          id: 'fav',
          modelValue: on.value,
          'onUpdate:modelValue': (value: boolean) => (on.value = value),
        }),
        h('label', { for: 'fav' }, 'Add to favorites'),
      ]),
      { attachTo: document.body },
    )
    await wrapper.get('label').trigger('click')
    expect(on.value).toBe(true)
    wrapper.unmount()
  })
})
