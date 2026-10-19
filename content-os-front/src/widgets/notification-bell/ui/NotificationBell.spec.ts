import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import NotificationBell from './NotificationBell.vue'

const listing = (read: boolean) => ({
  data: {
    unread: read ? 0 : 1,
    items: [
      {
        id: 'n1',
        type: 'deliverables_assigned',
        created_at: new Date().toISOString(),
        read,
        actor: { id: 'b1', name: 'Acme', photo_url: null },
        product: { id: 'p1', name: 'Black Abaya', photo: null },
        count: 3,
      },
    ],
  },
})

let wrapper: VueWrapper | undefined

async function mountBell(status: Me['status'] = 'approved') {
  setActivePinia(createPinia())
  useSessionStore().set({ id: 'ad1', role: 'art_director', status } as Me)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/tasks', name: 'tasks', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  wrapper = mount(NotificationBell, {
    attachTo: document.body,
    global: { plugins: [router, getActivePinia()!, PiniaColada] },
  })
  await flushPromises()
  return router
}

const bell = () => document.querySelector<HTMLButtonElement>('[aria-label^="Notifications"]')!

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('NotificationBell', () => {
  it('lights the dot only while something is unread', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(listing(true))
    await mountBell()
    expect(bell().getAttribute('aria-label')).toBe('Notifications')
  })

  it('asks nothing for a user who is not approved', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue(listing(false))
    await mountBell('pending_review')
    expect(get).not.toHaveBeenCalled()
  })

  it('opens the backlog of the product and reads the notification', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(listing(false))
    const post = vi.spyOn(http, 'post').mockResolvedValue({})
    const router = await mountBell()
    expect(bell().getAttribute('aria-label')).toBe('Notifications, unread')

    bell().click()
    await flushPromises()
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Acme assigned you 3 deliverables in Black Abaya'),
    )!
    link.click()
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/notifications/n1/read')
    expect(router.currentRoute.value.fullPath).toBe('/tasks?view=brand&product=p1')
  })

  it('marks all as read', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(listing(false))
    const post = vi.spyOn(http, 'post').mockResolvedValue({})
    await mountBell()
    bell().click()
    await flushPromises()
    ;[...document.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Mark all as read')!
      .click()
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/notifications/read')
  })
})
