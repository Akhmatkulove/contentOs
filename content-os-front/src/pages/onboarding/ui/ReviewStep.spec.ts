import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { draft } from '../model/draft'
import ReviewStep from './ReviewStep.vue'

function mountStep() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'onboarding-profile', component: { template: '<div />' } },
      { path: '/review', name: 'onboarding-review', component: ReviewStep },
    ],
  })
  return { router, wrapper: mount(ReviewStep, { global: { plugins: [router] } }) }
}

describe('ReviewStep', () => {
  beforeEach(() => {
    draft.role = 'manager'
    draft.name = 'Amina Karimova'
    draft.photo = null
  })

  it('shows the answers from the previous steps', () => {
    const { wrapper } = mountStep()
    expect(wrapper.text()).toContain('Amina Karimova')
    expect(wrapper.get('dd').text()).toBe('Manager / Art Director')
  })

  it('returns to the profile step on Back', async () => {
    const { router, wrapper } = mountStep()
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('onboarding-profile')
  })
})
