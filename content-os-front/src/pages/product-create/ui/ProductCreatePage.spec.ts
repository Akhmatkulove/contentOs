import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
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
  return mount(ProductCreatePage, { global: { plugins: [router] } })
}

const messages = ['Enter the product name.', 'Describe the product.', 'Add at least one photo.']

describe('ProductCreatePage', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
  })

  it('asks for a name, an about and a photo on submit, and drops each error once fixed', async () => {
    const wrapper = await mountPage()
    for (const message of messages) expect(wrapper.text()).not.toContain(message)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    for (const message of messages) expect(wrapper.text()).toContain(message)

    await wrapper.get('input[placeholder="Enter product name"]').setValue('Serum')
    await wrapper.get('textarea[placeholder="About"]').setValue('Daily serum')
    wrapper
      .getComponent(VDropzone)
      .vm.$emit('select', [new File(['x'], 'a.jpg', { type: 'image/jpeg' })])
    await flushPromises()
    for (const message of messages) expect(wrapper.text()).not.toContain(message)
  })
})
