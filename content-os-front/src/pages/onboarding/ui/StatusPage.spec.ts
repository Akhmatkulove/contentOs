import { flushPromises, mount } from '@vue/test-utils'
import { PiniaColada } from '@pinia/colada'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me, type Status } from '@/entities/session'
import { http } from '@/shared/api'
import StatusPage from './StatusPage.vue'

function me(status: Status) {
  return { name: 'Amina', status, onboarding_step: null } as Me
}

async function mountPage() {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/status', name: 'onboarding-status', component: StatusPage },
      { path: '/review', name: 'onboarding-review', component: stub },
    ],
  })
  await router.push('/status')
  return {
    router,
    wrapper: mount(StatusPage, { global: { plugins: [router, getActivePinia()!, PiniaColada] } }),
  }
}

function button(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'], text: string) {
  return wrapper.findAll('button').find((b) => b.text() === text)!
}

describe('StatusPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    useSessionStore().set(me('pending_review'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the under-review state with every wizard step done', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.get('h1').text()).toBe('Your application is under review')
    expect(wrapper.find('[aria-current="step"]').exists()).toBe(false)
  })

  it('lists the review progress', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.findAll('ul li').map((li) => li.text())).toEqual([
      'Application received',
      'Review in progress',
      'Workspace access',
    ])
  })

  it('checks the status every 30 seconds and welcomes the user once approved', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({ data: me('approved') })
    const { wrapper } = await mountPage()
    expect(get).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(30_000)
    await flushPromises()

    expect(get).toHaveBeenCalledWith('/me')
    expect(wrapper.get('h1').text()).toBe('You’re all set!')
    expect(wrapper.text()).not.toContain('Contact support')

    // Decided for good: no more polling.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('shows the rejection and lets the user update and resend', async () => {
    useSessionStore().set(me('rejected'))
    const post = vi.spyOn(http, 'post').mockResolvedValue({
      data: { ...me('onboarding'), onboarding_step: 'review' },
    })
    const { router, wrapper } = await mountPage()
    expect(wrapper.get('h1').text()).toBe('Your application wasn’t approved')

    await button(wrapper, 'Update and resend').trigger('click')
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/me/onboarding/reopen')
    expect(router.currentRoute.value.name).toBe('onboarding-review')
  })

  it('takes a pending application back for editing', async () => {
    vi.spyOn(http, 'post').mockResolvedValue({
      data: { ...me('onboarding'), onboarding_step: 'review' },
    })
    const { router, wrapper } = await mountPage()

    await button(wrapper, 'Edit my details').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('onboarding-review')
  })
})
