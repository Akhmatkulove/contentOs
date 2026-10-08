import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http } from '@/shared/api'
import ShootForm from './ShootForm.vue'

async function mountForm() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shoots', name: 'shoots', component: { template: '<div />' } },
      { path: '/shoots/new', name: 'shoot-create', component: ShootForm },
    ],
  })
  await router.push('/shoots/new')
  return mount(ShootForm, {
    global: { plugins: [router, createPinia(), PiniaColada] },
    attachTo: document.body,
  })
}

const errorTexts = (wrapper: Awaited<ReturnType<typeof mountForm>>) =>
  wrapper.findAll('p.text-red-400').map((p) => p.text())

describe('ShootForm', () => {
  // The team section asks for the art director's creators.
  beforeEach(() => {
    vi.spyOn(http, 'get').mockResolvedValue({ data: [] })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('marks the required details, not the location', async () => {
    const wrapper = await mountForm()
    const required = wrapper
      .findAll('label')
      .filter((label) => label.text().endsWith('*'))
      .map((label) => label.text().replace(/\s*\*$/, ''))
    expect(required).toEqual(['Shoot name', 'Date', 'Start time', 'Estimated duration'])
    wrapper.unmount()
  })

  it('shows what is missing and focuses the first such field', async () => {
    const wrapper = await mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(errorTexts(wrapper)).toEqual([
      'Enter the shoot name.',
      'Pick the shoot date.',
      'Pick the start time.',
      'Pick the estimated duration.',
      'Select at least one product.',
      'Add at least one deliverable.',
    ])
    expect(document.activeElement).toBe(
      wrapper.get('input[placeholder="Enter shoot name"]').element,
    )
    wrapper.unmount()
  })

  it('clears an error as soon as the field is fixed', async () => {
    const wrapper = await mountForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('input[placeholder="Enter shoot name"]').setValue('Autumn drop')
    await flushPromises()

    expect(errorTexts(wrapper)).not.toContain('Enter the shoot name.')
    wrapper.unmount()
  })

  it('saves a draft without asking for the details', async () => {
    const wrapper = await mountForm()

    const saveDraft = wrapper.findAll('button').find((b) => b.text() === 'Save draft')!
    await saveDraft.trigger('click')
    await flushPromises()

    expect(errorTexts(wrapper)).toEqual([])
    wrapper.unmount()
  })

  it('asks for at least one product on the browse button', async () => {
    const wrapper = await mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const browse = wrapper.findAll('button').find((b) => b.text() === 'Browse all products')!
    expect(browse.attributes('aria-invalid')).toBe('true')
    const message = document.getElementById(browse.attributes('aria-describedby')!)
    expect(message?.textContent).toBe('Select at least one product.')
    wrapper.unmount()
  })
})
