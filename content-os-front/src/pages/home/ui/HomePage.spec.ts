import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomePage from './HomePage.vue'

describe('HomePage', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('increments the counter on click', async () => {
    const wrapper = mount(HomePage)
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('count: 1')
  })
})
