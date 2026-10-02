import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import { PiniaColada } from '@pinia/colada'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import ReviewStep from './ReviewStep.vue'

const filled = {
  email: 'amina@example.com',
  role: 'art_director',
  name: 'Amina Karimova',
  photo_url: null,
  status: 'onboarding',
  onboarding_step: 'review',
} as Me

function mountStep() {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'onboarding-profile', component: stub },
      { path: '/review', name: 'onboarding-review', component: ReviewStep },
      { path: '/status', name: 'onboarding-status', component: stub },
    ],
  })
  return {
    router,
    wrapper: mount(ReviewStep, { global: { plugins: [router, getActivePinia()!, PiniaColada] } }),
  }
}

function button(wrapper: ReturnType<typeof mountStep>['wrapper'], text: string) {
  return wrapper.findAll('button').find((b) => b.text() === text)!
}

describe('ReviewStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSessionStore().set(filled)
  })

  it('shows the saved answers', () => {
    const { wrapper } = mountStep()
    expect(wrapper.text()).toContain('Amina Karimova')
    expect(wrapper.findAll('dd').map((dd) => dd.text())).toEqual([
      'amina@example.com',
      'Manager / Art Director',
    ])
  })

  it('returns to the profile step on Back', async () => {
    const { router, wrapper } = mountStep()
    await button(wrapper, 'Back').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('onboarding-profile')
  })

  it('shows the sending state while the application is on its way', async () => {
    vi.spyOn(http, 'post').mockReturnValue(new Promise(() => {}))
    const { wrapper } = mountStep()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('h1').text()).toBe('Sending your application…')
    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('sends the application and shows the sent state with every step done', async () => {
    const sent = { ...filled, status: 'pending_review', onboarding_step: null } as Me
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: sent })
    const { wrapper } = mountStep()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/me/onboarding/submit')
    expect(useSessionStore().me?.status).toBe('pending_review')
    expect(wrapper.get('h1').text()).toBe('Your application is in!')
    expect(wrapper.find('[aria-current="step"]').exists()).toBe(false)
    expect(wrapper.findAll('li svg')).toHaveLength(3)
  })

  it('takes the sent application back for editing', async () => {
    const sent = { ...filled, status: 'pending_review', onboarding_step: null } as Me
    const post = vi
      .spyOn(http, 'post')
      .mockResolvedValueOnce({ data: sent })
      .mockResolvedValueOnce({ data: filled })
    const { router, wrapper } = mountStep()
    await router.push('/status')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await button(wrapper, 'Edit my details').trigger('click')
    await flushPromises()

    expect(post).toHaveBeenLastCalledWith('/me/onboarding/reopen')
    expect(router.currentRoute.value.name).toBe('onboarding-review')
  })

  it('asks to wait instead of retrying when resends are limited', async () => {
    const response = { status: 429, data: {}, headers: {}, config: {} } as AxiosResponse
    vi.spyOn(http, 'post').mockRejectedValue(
      new AxiosError('too many', undefined, undefined, undefined, response),
    )
    const { wrapper } = mountStep()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('try again in an hour')
    expect(button(wrapper, 'Try again')).toBeUndefined()
  })

  it('shows the error state and returns to the form', async () => {
    vi.spyOn(http, 'post').mockRejectedValue(new Error('offline'))
    const { wrapper } = mountStep()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Your application wasn’t sent')
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Done')
    await button(wrapper, 'Back to application').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Ready to join Creator Lab?')
  })
})
