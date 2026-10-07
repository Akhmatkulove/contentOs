import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import VCheckbox from './v-checkbox.vue'

function mountCheckbox(props: { modelValue?: boolean | 'indeterminate'; disabled?: boolean } = {}) {
  const wrapper = mount(VCheckbox, {
    props: {
      modelValue: false,
      'onUpdate:modelValue': (value: boolean | 'indeterminate'): void => {
        void wrapper.setProps({ modelValue: value })
      },
      ...props,
    },
  })
  return wrapper
}

describe('VCheckbox', () => {
  it('is a checkbox that ticks on click', async () => {
    const wrapper = mountCheckbox()
    const box = wrapper.get('button')
    expect(box.attributes('role')).toBe('checkbox')
    expect(box.attributes('aria-checked')).toBe('false')

    await box.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(box.attributes('aria-checked')).toBe('true')
  })

  it('reports a partial selection as mixed', () => {
    const wrapper = mountCheckbox({ modelValue: 'indeterminate' })
    expect(wrapper.get('button').attributes('aria-checked')).toBe('mixed')
  })

  it('does not tick while disabled', async () => {
    const wrapper = mountCheckbox({ disabled: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('ticks from a <label> around it', async () => {
    const on = ref(false)
    const wrapper = mount(
      defineComponent(
        () => () =>
          h('label', [
            h(VCheckbox, {
              modelValue: on.value,
              'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                (on.value = value === true),
            }),
            'Black Abaya 042',
          ]),
      ),
      { attachTo: document.body },
    )
    await wrapper.get('label').trigger('click')
    expect(on.value).toBe(true)
    wrapper.unmount()
  })
})
