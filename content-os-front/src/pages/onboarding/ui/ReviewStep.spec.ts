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

  it('shows the sending state after submit', async () => {
    const { wrapper } = mountStep()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('h1').text()).toBe('Sending your application…')
    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('shows the sent state with every step done', async () => {
    const { wrapper } = mountStep()
    // No backend yet, so nothing in the UI moves the status past sending.
    ;(wrapper.vm as unknown as { status: string }).status = 'sent'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toBe('Your application is in!')
    expect(wrapper.find('[aria-current="step"]').exists()).toBe(false)
    expect(wrapper.findAll('li svg')).toHaveLength(3)
  })

  it('shows the error state and returns to the form', async () => {
    const { wrapper } = mountStep()
    // No backend yet, so nothing in the UI moves the status to error.
    ;(wrapper.vm as unknown as { status: string }).status = 'error'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toBe('Your application wasn’t sent')
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Done')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Back to application')!
      .trigger('click')
    expect(wrapper.get('h1').text()).toBe('Ready to join Creator Lab?')
  })
})
