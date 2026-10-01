import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import { router } from '.'

describe('router', () => {
  it('renders the 404 view for unknown paths', async () => {
    router.push('/does-not-exist')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('404')
  })
})
