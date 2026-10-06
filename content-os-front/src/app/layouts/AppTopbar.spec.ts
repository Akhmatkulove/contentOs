import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore, type Me } from '@/entities/session'
import AppTopbar from './AppTopbar.vue'

function mountTopbar(me: Partial<Me>) {
  setActivePinia(createPinia())
  useSessionStore().set({ name: 'Amina', photo_url: null, ...me } as Me)
  return mount(AppTopbar, { props: { title: 'References' } })
}

describe('AppTopbar', () => {
  it('shows the title, the bell and the initial without a photo', () => {
    const wrapper = mountTopbar({})
    expect(wrapper.get('h1').text()).toBe('References')
    expect(wrapper.text()).toContain('A')
    expect(wrapper.find('[aria-label^="Notifications"]').exists()).toBe(true)
  })

  it('shows the photo when there is one', () => {
    const wrapper = mountTopbar({ photo_url: '/me.webp' })
    expect(wrapper.get('img').attributes('src')).toBe('/me.webp')
  })
})
