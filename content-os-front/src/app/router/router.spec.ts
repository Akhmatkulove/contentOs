import { mount, flushPromises } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import { createPinia } from 'pinia'
import { http } from '@/shared/api'
import App from '../App.vue'
import { router } from '.'

function signedOut() {
  const response = { status: 401, data: {}, headers: {}, config: {} } as AxiosResponse
  vi.spyOn(http, 'get').mockRejectedValue(
    new AxiosError('unauthorized', undefined, undefined, undefined, response),
  )
}

async function open(path: string) {
  const pinia = createPinia()
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await router.push(path)
  await flushPromises()
  return wrapper
}

describe('router', () => {
  beforeEach(signedOut)

  it('renders the 404 view for unknown paths', async () => {
    const wrapper = await open('/does-not-exist')
    expect(wrapper.text()).toContain('404')
  })

  it.each([
    ['/login', 'Welcome back'],
    ['/signup', 'Create your account'],
  ])('renders %s inside the auth layout', async (path, heading) => {
    const wrapper = await open(path)
    expect(wrapper.find('main img[alt="Creator Lab"]').exists()).toBe(true)
    expect(wrapper.get('h1').text()).toBe(heading)
  })

  it('sends a signed-out visitor from the dashboard to login', async () => {
    await open('/')
    expect(router.currentRoute.value.name).toBe('login')
  })
})
