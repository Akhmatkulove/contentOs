import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'
import { http } from '@/shared/api'
import ShootForm from './ShootForm.vue'

const creators = [
  { id: 'amina', name: 'Amina', photo_url: null },
  { id: 'lana', name: 'Lana', photo_url: null },
  { id: 'odina', name: 'Odina', photo_url: null },
]

async function mountForm() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().set({
    id: 'ad',
    email: 'risolat@example.com',
    role: 'art_director',
    status: 'approved',
    name: 'Risolat',
    photo_url: null,
    is_admin: false,
    onboarding_step: null,
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shoots', name: 'shoots', component: { template: '<div />' } },
      { path: '/shoots/new', name: 'shoot-create', component: ShootForm },
    ],
  })
  await router.push('/shoots/new')
  const wrapper = mount(ShootForm, {
    global: { plugins: [router, pinia, PiniaColada] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const team = () => document.body.querySelector('section[aria-labelledby]:nth-of-type(2)')!
const groupText = (label: string) =>
  [...document.body.querySelectorAll<HTMLElement>('[role="group"]')]
    .find((group) => group.querySelector('span')?.textContent?.trim() === label)!
    .textContent?.replace(/\s+/g, ' ')
    .trim()
const chips = () =>
  [...document.body.querySelectorAll('[aria-label^="Remove "]')].map((b) =>
    b.getAttribute('aria-label')!.replace('Remove ', ''),
  )
// The picker list is portalled to <body>.
const options = () =>
  [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].map((el) =>
    el.textContent!.trim(),
  )
const option = (name: string) =>
  [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (el) => el.textContent!.trim() === name,
  )!

function button(text: string) {
  return [...document.body.querySelectorAll<HTMLElement>('button')].find(
    (b) => b.textContent!.trim() === text,
  )!
}

async function click(el: HTMLElement) {
  el.click()
  await flushPromises()
}

describe('Shoot team', () => {
  beforeEach(() => {
    vi.spyOn(http, 'get').mockImplementation(async (url: string) => ({
      data: url === '/team/creators' ? creators : [],
    }))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('has the signed-in art director, no one else yet', async () => {
    const wrapper = await mountForm()
    expect(team()).toBeTruthy()
    expect(groupText('Art Director')).toContain('Risolat')
    // Shown, not picked: nothing to press in the art director's box.
    const artDirector = [...document.body.querySelectorAll('[role="group"]')][0]!
    expect(artDirector.querySelector('button')).toBeNull()
    expect(chips()).toEqual([])
    expect(groupText('Mobilographer')).toContain('Select mobilographer')
    wrapper.unmount()
  })

  it('adds any number of the art director’s creators and removes them', async () => {
    const wrapper = await mountForm()
    expect(http.get).toHaveBeenCalledWith('/team/creators')

    await click(button('Add creator'))
    expect(options()).toEqual(['AAmina', 'LLana', 'OOdina'])
    await click(option('AAmina'))
    await click(option('LLana'))
    // The list stays open for more and ticks who is in.
    expect(option('AAmina').getAttribute('aria-selected')).toBe('true')
    expect(chips()).toEqual(['Amina', 'Lana'])

    await click(document.body.querySelector<HTMLElement>('[aria-label="Remove Amina"]')!)
    expect(chips()).toEqual(['Lana'])
    wrapper.unmount()
  })

  it('takes one mobilographer who is then not offered as a creator', async () => {
    const wrapper = await mountForm()

    await click(button('Select mobilographer'))
    await click(option('OOdina'))
    expect(groupText('Mobilographer')).toContain('Odina')
    // One pick closes the list.
    expect(options()).toEqual([])

    await click(button('Add creator'))
    expect(options()).toEqual(['AAmina', 'LLana'])
    wrapper.unmount()
  })

  it('clears the mobilographer', async () => {
    const wrapper = await mountForm()
    await click(button('Select mobilographer'))
    await click(option('OOdina'))

    await click(document.body.querySelector<HTMLElement>('[aria-label="Remove Odina"]')!)

    expect(groupText('Mobilographer')).toContain('Select mobilographer')
    wrapper.unmount()
  })
})
