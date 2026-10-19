import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http } from '@/shared/api'
import ProductPage from './ProductPage.vue'

const image = (id: string) => ({ id, kind: 'image', content_type: 'image/webp', url: `/${id}` })

function product(canEdit: boolean) {
  return {
    id: 'p1',
    name: 'Black Abaya 042',
    about: 'A modern, minimal abaya.',
    notes: null,
    collection: 'Autumn 26',
    category: 'Abayas',
    sku: 'BA-042',
    status: 'active',
    tags: ['Minimal', 'Elegant'],
    photos: [image('photo-1'), image('photo-2')],
    references: [
      {
        id: 'r1',
        title: 'Fabric close-up',
        type: null,
        link: null,
        collection: null,
        notes: null,
        tags: [],
        product_id: 'p1',
        author_id: 'b',
        author: 'Acme',
        files: [image('mood-1')],
        favorite: false,
        created_at: '2026-10-07T10:00:00Z',
      },
    ],
    deliverables: [
      {
        id: 'd1',
        name: 'Walking transition',
        assignee: { id: 'a', name: 'Amina', photo_url: null },
        status: 'approved',
        due_date: '2024-09-18',
        brief: null,
      },
      {
        id: 'd2',
        name: 'Fabric close-up',
        assignee: { id: 'a', name: 'Amina', photo_url: null },
        status: 'to_shoot',
        due_date: null,
        brief: null,
      },
    ],
    created_at: '2026-10-07T10:00:00Z',
    can_edit: canEdit,
  }
}

async function mountPage(data: unknown, path = '/products/p1') {
  vi.spyOn(http, 'get').mockImplementation(async () => {
    if (data instanceof Error) throw data
    return { data }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products/:id', name: 'product', component: ProductPage, props: true },
      { path: '/products/:id/edit', name: 'product-edit', component: { template: '<div />' } },
      { path: '/products', name: 'products', component: { template: '<div />' } },
      { path: '/references/:id', name: 'reference', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(ProductPage, {
    props: { id: 'p1' },
    global: { plugins: [router, createPinia(), PiniaColada] },
  })
  await flushPromises()
  return { wrapper, router }
}

const editLinks = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAll('a')
    .map((a) => a.attributes('href'))
    .filter((href) => href?.includes('/edit'))

describe('ProductPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the product, its progress and team', async () => {
    const { wrapper } = await mountPage(product(true))

    expect(wrapper.get('h1').text()).toBe('Black Abaya 042')
    expect(wrapper.text()).toContain('Autumn 26·Abayas·SKU: BA-042')
    expect(wrapper.text()).toContain('1 / 2 deliverables')
    expect(wrapper.text()).toContain('50%')
    expect(wrapper.findAll('[aria-labelledby="product-team"] li')).toHaveLength(1)
    expect(wrapper.find('img[src="/mood-1"]').exists()).toBe(true)
  })

  it('gives the owner Edit and "+" buttons, each to its section of the form', async () => {
    const { wrapper } = await mountPage(product(true))

    expect(new Set(editLinks(wrapper))).toEqual(
      new Set([
        '/products/p1/edit',
        '/products/p1/edit#photos',
        '/products/p1/edit#details',
        '/products/p1/edit#references',
      ]),
    )
  })

  it('gives an art director no edit buttons, only the "…" menu', async () => {
    const { wrapper } = await mountPage(product(false))

    expect(editLinks(wrapper)).toEqual([])
    expect(wrapper.find('[aria-label="Product actions"]').exists()).toBe(true)
  })

  it('opens the tab from the URL and keeps the switch in it', async () => {
    const { wrapper, router } = await mountPage(product(true), '/products/p1?tab=deliverables')

    expect(wrapper.text()).toContain('Plan and track the content pieces')
    expect(wrapper.text()).toContain('2 deliverables')

    const references = wrapper.findAll('[role="tab"]').find((tab) => tab.text() === 'References')!
    await references.trigger('mousedown', { button: 0 })
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'references' })
    expect(wrapper.text()).toContain('1 reference')
    expect(wrapper.find('[aria-label="Favorite Fabric close-up"]').exists()).toBe(false)
  })

  it('says so when the product is not there', async () => {
    const error = Object.assign(new Error('Not found'), { status: 404 })
    const { wrapper } = await mountPage(error)

    expect(wrapper.text()).toContain('doesn’t exist or you don’t have access')
  })
})
