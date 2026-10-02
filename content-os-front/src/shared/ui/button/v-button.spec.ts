import { mount } from '@vue/test-utils'
import VButton from './v-button.vue'

describe('VButton', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    const wrapper = mount(VButton, { slots: { default: 'Add product' } })
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Add product')
  })

  it('lets classes from outside override the variant', () => {
    const wrapper = mount(VButton, { props: { size: 'icon-36', class: 'rounded-lg' } })
    expect(wrapper.classes()).toContain('rounded-lg')
    expect(wrapper.classes()).not.toContain('rounded-full')
  })

  it('passes clicks and attributes through', async () => {
    const wrapper = mount(VButton, { attrs: { 'aria-label': 'More actions' } })
    await wrapper.trigger('click')
    expect(wrapper.attributes('aria-label')).toBe('More actions')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('can render a link with the button look', () => {
    const wrapper = mount(VButton, {
      props: { asChild: true, variant: 'outline' },
      slots: { default: '<a href="/products/new">Add product</a>' },
    })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('type')).toBeUndefined()
    expect(wrapper.classes()).toContain('border-default')
  })
})
