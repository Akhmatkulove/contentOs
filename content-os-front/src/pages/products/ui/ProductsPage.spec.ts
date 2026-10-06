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

async function mountPage(path = '/products') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products', name: 'products', component: ProductsPage },
      { path: '/products/new', name: 'product-create', component: { template: '<div />' } },
      { path: '/products/:id', name: 'product', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(ProductsPage, {
    global: { plugins: [router, createPinia(), PiniaColada] },
  })
  await flushPromises()
  return Object.assign(wrapper, { router })
}

describe('ProductsPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the products from the backend', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      data: { items: [item('1', 'Linen shirt'), item('2', 'Silk dress')], total: 2 },
    })

    const wrapper = await mountPage()

    expect(get).toHaveBeenCalledWith('/products', {
      params: {
        search: undefined,
        collection: undefined,
        status: undefined,
        sort: 'newest',
        page: 1,
        per_page: 8,
      },
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

  it('filters by collection and status and sorts on the backend', async () => {
    const get = vi.spyOn(http, 'get').mockImplementation(async (url: string) => ({
      data:
        url === '/products/filters'
          ? { collections: ['Autumn 26', 'Summer 26'] }
          : { items: [item('1', 'Linen shirt')], total: 1 },
    }))
    const wrapper = await mountPage()

    const triggers = wrapper.findAll(
      '[aria-label="Collection"], [aria-label="Status"], [aria-label="Sort"]',
    )
    expect(triggers.map((trigger) => trigger.text())).toEqual([
      'Collection: All collections',
      'Status: All statuses',
      'Sort by: Newest first',
    ])

    const selects = wrapper.findAllComponents({ name: 'VSelect' })
    selects[0]!.vm.$emit('update:modelValue', 'Autumn 26')
    selects[1]!.vm.$emit('update:modelValue', 'archived')
    selects[2]!.vm.$emit('update:modelValue', 'name_asc')
    await flushPromises()

    expect(get).toHaveBeenLastCalledWith('/products', {
      params: {
        search: undefined,
        collection: 'Autumn 26',
        status: 'archived',
        sort: 'name_asc',
        page: 1,
        per_page: 8,
      },
    })
  })

  it('keeps the filters in the URL and opens them from it', async () => {
    const get = vi.spyOn(http, 'get').mockImplementation(async (url: string) => ({
      data: url === '/products/filters' ? { collections: [] } : { items: [], total: 30 },
    }))
    const wrapper = await mountPage('/products?status=archived&sort=oldest&page=2')

    expect(get).toHaveBeenCalledWith('/products', {
      params: expect.objectContaining({ status: 'archived', sort: 'oldest', page: 2 }),
    })

    const selects = wrapper.findAllComponents({ name: 'VSelect' })
    selects[1]!.vm.$emit('update:modelValue', 'active')
    await flushPromises()
    // A new filter starts from the first page; the defaults leave the URL.
    expect(wrapper.router.currentRoute.value.query).toEqual({ status: 'active', sort: 'oldest' })
  })
})
