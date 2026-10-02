import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import { PiniaColada } from '@pinia/colada'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import LoginPage from './LoginPage.vue'

const stub = { template: '<div />' }
let pinia: ReturnType<typeof createPinia>

async function mountPage(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginPage },
      { path: '/signup', name: 'signup', component: stub },
      { path: '/', name: 'home', component: stub },
      { path: '/onboarding/profile', name: 'onboarding-profile', component: stub },
    ],
  })
  await router.push(`/login${query}`)
  return {
    router,
    wrapper: mount(LoginPage, { global: { plugins: [router, pinia, PiniaColada] } }),
  }
}

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper']) {
  await wrapper.get('input[name="email"]').setValue('anna@example.com')
  await wrapper.get('input[name="password"]').setValue('anna-password')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

function failWith(status: number) {
  const response = { status, data: {}, headers: {}, config: {} } as AxiosResponse
  vi.spyOn(http, 'post').mockRejectedValue(
    new AxiosError('failed', undefined, undefined, undefined, response),
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('logs in and resumes where the user left off', async () => {
    const me = { status: 'onboarding', onboarding_step: 'profile' } as Me
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: me })
    const { router, wrapper } = await mountPage()

    await fillAndSubmit(wrapper)

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'anna@example.com',
      password: 'anna-password',
    })
    expect(useSessionStore().me).toEqual(me)
    expect(router.currentRoute.value.name).toBe('onboarding-profile')
  })

  it('shows a wrong-credentials error', async () => {
    failWith(401)
    const { router, wrapper } = await mountPage()

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe('Invalid email or password.')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('shows a generic error when the server fails', async () => {
    failWith(500)
    const { wrapper } = await mountPage()

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe('Something went wrong. Please try again.')
  })

  it('asks to wait after too many attempts', async () => {
    failWith(429)
    const { wrapper } = await mountPage()

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toContain('Too many attempts')
  })

  it('explains a failed Google sign-in', async () => {
    const { wrapper } = await mountPage('?error=google')

    expect(wrapper.get('[role="alert"]').text()).toContain('Google')
  })

  it('keeps Log in disabled until both fields are filled', async () => {
    const { wrapper } = await mountPage()
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="email"]').setValue('anna@example.com')
    await wrapper.get('input[name="password"]').setValue('x')

    expect(submit.attributes('disabled')).toBeUndefined()
  })
})
