import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { draft } from '../model/draft'
import ProfileStep from './ProfileStep.vue'

function mountStep() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/role', name: 'onboarding-role', component: { template: '<div />' } },
      { path: '/profile', name: 'onboarding-profile', component: ProfileStep },
    ],
  })
  return { router, wrapper: mount(ProfileStep, { global: { plugins: [router] } }) }
}

describe('ProfileStep', () => {
  beforeEach(() => {
    draft.name = ''
    draft.photo = null
  })

  it('enables Continue only after a name is entered', async () => {
    const { wrapper } = mountStep()
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="name"]').setValue('Amina')

    expect(submit.attributes('disabled')).toBeUndefined()
    expect(draft.name).toBe('Amina')
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
