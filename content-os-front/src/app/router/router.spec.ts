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

  it.each([
    ['/login', 'Welcome back'],
    ['/signup', 'Create your account'],
  ])('renders %s inside the auth layout', async (path, heading) => {
    router.push(path)
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    expect(wrapper.find('main img[alt="Creator Lab"]').exists()).toBe(true)
    expect(wrapper.get('h1').text()).toBe(heading)
  })
})
