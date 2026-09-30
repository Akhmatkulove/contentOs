import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '@/views/HomeView.vue'

describe('HomeView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('increments the counter on click', async () => {
    const wrapper = mount(HomeView)
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('count: 1')
  })
})
