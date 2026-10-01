import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import SignupPage from './SignupPage.vue'

const stub = { template: '<div />' }

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/signup', name: 'signup', component: SignupPage },
      { path: '/login', name: 'login', component: stub },
      { path: '/onboarding/role', name: 'onboarding-role', component: stub },
    ],
  })
  await router.push('/signup')
  return { router, wrapper: mount(SignupPage, { global: { plugins: [router] } }) }
}

type Wrapper = Awaited<ReturnType<typeof mountPage>>['wrapper']

async function fill(wrapper: Wrapper, password = 'anna-password', repeat = password) {
  await wrapper.get('input[name="email"]').setValue('anna@example.com')
  await wrapper.get('input[name="password"]').setValue(password)
  await wrapper.get('input[name="password-repeat"]').setValue(repeat)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('SignupPage', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('creates the account and starts onboarding', async () => {
    const me = { status: 'onboarding', onboarding_step: 'role' } as Me
    vi.spyOn(http, 'post').mockResolvedValue({ data: me })
    const { router, wrapper } = await mountPage()

    await fill(wrapper)

    expect(useSessionStore().me).toEqual(me)
    expect(router.currentRoute.value.name).toBe('onboarding-role')
  })

  it('checks password length and repeat before sending', async () => {
    const post = vi.spyOn(http, 'post')
    const { wrapper } = await mountPage()

    await fill(wrapper, 'short', 'other')

    expect(post).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Use at least 8 characters.')
    expect(wrapper.text()).toContain('Passwords don’t match.')
  })

  it('points to login when the email is taken', async () => {
    const response = { status: 409, data: {}, headers: {}, config: {} } as AxiosResponse
    vi.spyOn(http, 'post').mockRejectedValue(
      new AxiosError('conflict', undefined, undefined, undefined, response),
    )
    const { router, wrapper } = await mountPage()

    await fill(wrapper)

    expect(wrapper.text()).toContain('This email is already registered.')
    expect(router.currentRoute.value.name).toBe('signup')
  })
})
