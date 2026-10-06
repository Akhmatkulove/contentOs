import { mount } from '@vue/test-utils'
import VClearFilters from './v-clear-filters.vue'

describe('VClearFilters', () => {
  it('shows how many filters are on and asks to clear them', async () => {
    const wrapper = mount(VClearFilters, { props: { count: 2 } })
    const button = wrapper.get('button')
    expect(button.text()).toBe('Clear filters 2')
    expect(button.attributes('aria-label')).toBe('Clear 2 filters')
    await button.trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('speaks of one filter in the singular', () => {
    const wrapper = mount(VClearFilters, { props: { count: 1 } })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Clear 1 filter')
  })
})
