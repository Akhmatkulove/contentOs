import { flushPromises, mount } from '@vue/test-utils'
import { PiniaColada } from '@pinia/colada'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import RoleStep from './RoleStep.vue'

function mountStep() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/role', name: 'onboarding-role', component: RoleStep },
      { path: '/profile', name: 'onboarding-profile', component: { template: '<div />' } },
    ],
  })
  return {
    router,
    wrapper: mount(RoleStep, { global: { plugins: [router, getActivePinia()!, PiniaColada] } }),
  }
}

describe('RoleStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSessionStore().set({ role: null, status: 'onboarding', onboarding_step: 'role' } as Me)
  })

  it('enables Continue only after a role is picked', async () => {
    const { wrapper } = mountStep()
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('input[value="art_director"]').setValue()

    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('starts from the saved role when coming back', () => {
    useSessionStore().set({ role: 'brand', status: 'onboarding' } as Me)
    const { wrapper } = mountStep()
    expect((wrapper.get('input[value="brand"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('saves the role and goes to the profile step', async () => {
    const saved = { role: 'brand', status: 'onboarding', onboarding_step: 'profile' } as Me
    const patch = vi.spyOn(http, 'patch').mockResolvedValue({ data: saved })
    const { router, wrapper } = mountStep()

    await wrapper.get('input[value="brand"]').setValue()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/me/onboarding', { role: 'brand' })
    expect(useSessionStore().me).toEqual(saved)
    expect(router.currentRoute.value.name).toBe('onboarding-profile')
  })

  it('stays on the step and says so when saving fails', async () => {
    vi.spyOn(http, 'patch').mockRejectedValue(new Error('offline'))
    const { router, wrapper } = mountStep()
    await router.push('/role')

    await wrapper.get('input[value="brand"]').setValue()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Couldn’t save')
    expect(router.currentRoute.value.name).toBe('onboarding-role')
  })

  it('marks the first step as current', () => {
    const { wrapper } = mountStep()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Your role')
  })
})
