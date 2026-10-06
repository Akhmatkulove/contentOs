import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http } from '@/shared/api'
import { VDropzone } from '@/shared/ui/dropzone'
import ProductCreatePage from './ProductCreatePage.vue'

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products/new', name: 'product-create', component: ProductCreatePage },
      { path: '/products', name: 'products', component: { template: '<div />' } },
    ],
  })
  await router.push('/products/new')
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().set({ name: 'Acme', role: 'brand', status: 'approved' } as Me)
  const wrapper = mount(ProductCreatePage, { global: { plugins: [router, pinia, PiniaColada] } })
  return { wrapper, router }
}

const messages = ['Enter the product name.', 'Describe the product.', 'Add at least one photo.']
const jpeg = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

describe('ProductCreatePage', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('asks for a name, an about and a photo on submit, and drops each error once fixed', async () => {
    const { wrapper } = await mountPage()
    for (const message of messages) expect(wrapper.text()).not.toContain(message)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    for (const message of messages) expect(wrapper.text()).toContain(message)

    await wrapper.get('input[placeholder="Enter product name"]').setValue('Serum')
    await wrapper.get('textarea[placeholder="About"]').setValue('Daily serum')
    wrapper.getComponent(VDropzone).vm.$emit('select', [jpeg('a.jpg')])
    await flushPromises()
    for (const message of messages) expect(wrapper.text()).not.toContain(message)
  })

  it('uploads the photos, creates the product with their ids and goes to products', async () => {
    let uploaded = 0
    const post = vi.spyOn(http, 'post').mockImplementation(async (url: string) => {
      if (url === '/uploads') return { data: { id: `file-${++uploaded}` } }
      return { data: { id: 'product-1' } }
    })
    const { wrapper, router } = await mountPage()

    await wrapper.get('input[placeholder="Enter product name"]').setValue(' Serum ')
    await wrapper.get('textarea[placeholder="About"]').setValue('Daily serum')
    await wrapper.get('input[placeholder="Enter collection"]').setValue('Summer 26')
    wrapper.getComponent(VDropzone).vm.$emit('select', [jpeg('a.jpg'), jpeg('b.jpg')])
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(post.mock.calls.filter(([url]) => url === '/uploads')).toHaveLength(2)
    const [, body] = post.mock.calls.find(([url]) => url === '/products')!
    expect(body).toMatchObject({
      name: 'Serum',
      about: 'Daily serum',
      collection: 'Summer 26',
      status: 'active',
      photo_ids: ['file-1', 'file-2'],
      references: [],
    })
    expect(router.currentRoute.value.name).toBe('products')
  })
})
