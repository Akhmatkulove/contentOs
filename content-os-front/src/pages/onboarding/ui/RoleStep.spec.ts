import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { draft } from '../model/draft'
import RoleStep from './RoleStep.vue'

function mountStep() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/role', name: 'onboarding-role', component: RoleStep },
      { path: '/profile', name: 'onboarding-profile', component: { template: '<div />' } },
    ],
  })
  return { router, wrapper: mount(RoleStep, { global: { plugins: [router] } }) }
}

describe('RoleStep', () => {
  beforeEach(() => {
    draft.role = null
  })

  it('enables Continue only after a role is picked', async () => {
    const { wrapper } = mountStep()
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('input[value="manager"]').setValue()

    expect(submit.attributes('disabled')).toBeUndefined()
    expect(draft.role).toBe('manager')
  })

  it('goes to the profile step on submit', async () => {
    const { router, wrapper } = mountStep()
    await wrapper.get('input[value="brand"]').setValue()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('onboarding-profile')
  })

  it('marks the first step as current', () => {
    const { wrapper } = mountStep()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Your role')
  })
})
