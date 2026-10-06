import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http } from '@/shared/api'
import ProductsPage from './ProductsPage.vue'

function item(id: string, name: string) {
  return {
    id,
    name,
    collection: 'Summer 26',
    sku: null,
    status: 'active',
    photo: null,
    created_at: '2026-10-04T10:00:00Z',
  }
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products', name: 'products', component: ProductsPage },
      { path: '/products/new', name: 'product-create', component: { template: '<div />' } },
      { path: '/products/:id', name: 'product', component: { template: '<div />' } },
    ],
  })
  await router.push('/products')
  const wrapper = mount(ProductsPage, {
    global: { plugins: [router, createPinia(), PiniaColada] },
  })
  await flushPromises()
  return wrapper
}

describe('ProductsPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the products from the backend', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      data: { items: [item('1', 'Linen shirt'), item('2', 'Silk dress')], total: 2 },
    })

    const wrapper = await mountPage()

    expect(get).toHaveBeenCalledWith('/products', {
      params: { search: undefined, page: 1, per_page: 8 },
    })
    expect(wrapper.findAll('article h3').map((h) => h.text())).toEqual([
      'Linen shirt',
      'Silk dress',
    ])
    expect(wrapper.text()).toContain('2 products')
    expect(wrapper.text()).toContain('Summer 26')
    // The title opens the product; the link covers the whole card.
    expect(wrapper.get('article h3 a').attributes('href')).toBe('/products/1')
  })

  it('shows the first-product screen when there are none', async () => {
    vi.spyOn(http, 'get').mockResolvedValue({ data: { items: [], total: 0 } })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('No products yet')
  })
})
