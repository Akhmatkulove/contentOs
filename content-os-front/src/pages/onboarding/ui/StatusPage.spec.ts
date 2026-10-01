import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import StatusPage from './StatusPage.vue'

function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
  })
  return mount(StatusPage, { global: { plugins: [router] } })
}

describe('StatusPage', () => {
  it('shows the under-review state with every wizard step done', () => {
    const wrapper = mountPage()
    expect(wrapper.get('h1').text()).toBe('Your application is under review')
    expect(wrapper.find('[aria-current="step"]').exists()).toBe(false)
  })

  it('lists the review progress', () => {
    const wrapper = mountPage()
    expect(wrapper.findAll('ul li').map((li) => li.text())).toEqual([
      'Application received',
      'Review in progress',
      'Workspace access',
    ])
  })

  it('shows the welcome state once approved, without the support link', async () => {
    const wrapper = mountPage()
    // No backend yet, so nothing in the UI moves the status to approved.
    ;(wrapper.vm as unknown as { status: string }).status = 'approved'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toBe('You’re all set!')
    expect(wrapper.text()).not.toContain('Contact support')
  })
})
