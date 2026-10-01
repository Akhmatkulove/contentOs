import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import ProfileStep from './ProfileStep.vue'

function mountStep() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/role', name: 'onboarding-role', component: { template: '<div />' } },
      { path: '/profile', name: 'onboarding-profile', component: ProfileStep },
      { path: '/review', name: 'onboarding-review', component: { template: '<div />' } },
    ],
  })
  return { router, wrapper: mount(ProfileStep, { global: { plugins: [router] } }) }
}

async function pickPhoto(wrapper: ReturnType<typeof mountStep>['wrapper']) {
  const input = wrapper.get('input[name="photo"]')
  const photo = new File(['jpeg'], 'me.jpg', { type: 'image/jpeg' })
  Object.defineProperty(input.element, 'files', { value: [photo], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

describe('ProfileStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSessionStore().set({ role: 'creator', name: null, photo_url: null } as Me)
  })

  it('enables Continue only after a name is entered', async () => {
    const { wrapper } = mountStep()
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="name"]').setValue('Amina')

    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('saves the trimmed name and goes to review', async () => {
    const patch = vi.spyOn(http, 'patch').mockResolvedValue({ data: { name: 'Amina' } })
    const { router, wrapper } = mountStep()

    await wrapper.get('input[name="name"]').setValue('  Amina ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/me/onboarding', { name: 'Amina' })
    expect(router.currentRoute.value.name).toBe('onboarding-review')
  })

  it('uploads the photo right away and shows the stored one', async () => {
    const put = vi
      .spyOn(http, 'put')
      .mockResolvedValue({ data: { photo_url: 'http://files/avatars/1.webp' } })
    const { wrapper } = mountStep()

    await pickPhoto(wrapper)

    expect(put).toHaveBeenCalledWith('/me/photo', expect.any(FormData), expect.anything())
    expect(wrapper.get('img').attributes('src')).toBe('http://files/avatars/1.webp')
  })

  it.each([
    [413, 'This photo is larger than 5MB.'],
    [422, 'Use a JPG or PNG image.'],
  ])('explains a rejected photo (%i)', async (status, message) => {
    const response = { status, data: {}, headers: {}, config: {} } as AxiosResponse
    vi.spyOn(http, 'put').mockRejectedValue(
      new AxiosError('rejected', undefined, undefined, undefined, response),
    )
    const { wrapper } = mountStep()

    await pickPhoto(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe(message)
  })

  it('returns to the role step on Back', async () => {
    const { router, wrapper } = mountStep()
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('onboarding-role')
  })

  it('marks the role step as done and the profile step as current', () => {
    const { wrapper } = mountStep()
    const steps = wrapper.findAll('li')
    expect(steps[0]!.find('svg').exists()).toBe(true)
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Profile')
  })
})
