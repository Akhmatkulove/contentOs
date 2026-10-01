import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import HomePage from './HomePage.vue'

describe('HomePage', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('greets the user and logs out', async () => {
    const session = useSessionStore()
    session.set({ name: 'Anna', role: 'creator', status: 'approved' } as Me)
    const post = vi.spyOn(http, 'post').mockResolvedValue({})
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: HomePage },
        { path: '/login', name: 'login', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    const wrapper = mount(HomePage, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Hello, Anna')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/auth/logout')
    expect(session.me).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
  })
})
