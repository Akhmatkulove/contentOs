import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ServerErrorPage from './ServerErrorPage.vue'

async function open(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/signup', component: { template: '<div />' } },
      { path: '/error', component: ServerErrorPage },
    ],
  })
  await router.push(path)
  const wrapper = mount(ServerErrorPage, { global: { plugins: [router] } })
  return { router, wrapper }
}

describe('ServerErrorPage', () => {
  it('retries the path the visitor was going to', async () => {
    const { router, wrapper } = await open('/error?from=%2Fsignup')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/signup')
  })

  it.each(['/error', '/error?from=https%3A%2F%2Fevil.com'])(
    'falls back to the root for %s',
    async (path) => {
      const { router, wrapper } = await open(path)
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/')
    },
  )
})
