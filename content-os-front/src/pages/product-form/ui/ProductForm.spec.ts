import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { http, uploadFile, type UploadedFile } from '@/shared/api'
import { VDropzone } from '@/shared/ui/dropzone'
import { openAddDeliverable } from '../model/add-deliverable'
import ProductCreatePage from './ProductCreatePage.vue'
import ProductEditPage from './ProductEditPage.vue'

vi.mock('../model/add-deliverable', () => ({ openAddDeliverable: vi.fn() }))
// How a file reaches the storage is uploadFile's business (shared/api/uploads.spec.ts).
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  uploadFile: vi.fn(),
}))

function uploadsAs(...ids: string[]) {
  let next = 0
  vi.mocked(uploadFile).mockImplementation(async () => ({ id: ids[next++] }) as UploadedFile)
}

// The product for GET /products/…; the Collection field's suggestions are empty.
function getReturns(product: object) {
  vi.spyOn(http, 'get').mockImplementation(async (url) => ({
    data: url === '/collections' ? [] : product,
  }))
}

async function mountPage(path = '/products/new') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products/new', name: 'product-create', component: ProductCreatePage },
      { path: '/products/:id/edit', name: 'product-edit', component: ProductEditPage, props: true },
      { path: '/products/:id', name: 'product', component: { template: '<div />' } },
      { path: '/products', name: 'products', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().set({ id: 'brand-1', name: 'Acme', role: 'brand', status: 'approved' } as Me)
  const page = router.currentRoute.value.matched[0]!.components!.default!
  const wrapper = mount(page, {
    props: router.currentRoute.value.params,
    global: { plugins: [router, pinia, PiniaColada] },
  })
  return { wrapper, router }
}

const messages = ['Enter the product name.', 'Describe the product.', 'Add at least one photo.']
const jpeg = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

describe('ProductCreatePage', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

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

  it('uploads the photos, creates the product with their ids and opens it', async () => {
    uploadsAs('file-1', 'file-2')
    getReturns({})
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: { id: 'product-1' } })
    const { wrapper, router } = await mountPage()

    await wrapper.get('input[placeholder="Enter product name"]').setValue(' Serum ')
    await wrapper.get('textarea[placeholder="About"]').setValue('Daily serum')
    await wrapper.get('input[placeholder="Select or create collection"]').setValue('Summer 26')
    wrapper.getComponent(VDropzone).vm.$emit('select', [jpeg('a.jpg'), jpeg('b.jpg')])
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(uploadFile).toHaveBeenCalledTimes(2)
    const [, body] = post.mock.calls.find(([url]) => url === '/products')!
    expect(body).toMatchObject({
      name: 'Serum',
      about: 'Daily serum',
      collection: 'Summer 26',
      status: 'active',
      photo_ids: ['file-1', 'file-2'],
      references: [],
      deliverables: [],
    })
    expect(router.currentRoute.value.fullPath).toBe('/products/product-1')
  })

  it('sends the deliverables with the product, each to its art director', async () => {
    vi.mocked(openAddDeliverable).mockResolvedValueOnce({
      id: 'draft-1',
      name: 'Walking transition',
      type: 'video',
      assignee: { id: 'ad-1', name: 'Amina', photo_url: null },
      status: 'to_shoot',
      dueDate: '2024-09-18',
      brief: '',
    })
    uploadsAs('file-1')
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: { id: 'product-1' } })
    const { wrapper } = await mountPage()

    await wrapper.get('input[placeholder="Enter product name"]').setValue('Abaya')
    await wrapper.get('textarea[placeholder="About"]').setValue('Black abaya')
    wrapper.getComponent(VDropzone).vm.$emit('select', [jpeg('a.jpg')])
    const add = wrapper.findAll('button').find((b) => b.text() === 'Add deliverable')!
    await add.trigger('click')
    await flushPromises()
    expect(openAddDeliverable).toHaveBeenCalledWith({ product: 'Abaya' })
    expect(wrapper.text()).toContain('Walking transition')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const [, body] = post.mock.calls.find(([url]) => url === '/products')!
    expect(body).toMatchObject({
      deliverables: [
        {
          name: 'Walking transition',
          type: 'video',
          assignee_id: 'ad-1',
          status: 'to_shoot',
          due_date: '2024-09-18',
          brief: null,
        },
      ],
    })
  })

  it('edits a product: keeps what stays, uploads what is new, drops what was removed', async () => {
    const photo = (id: string) => ({ id, kind: 'image', content_type: 'image/webp', url: id })
    const saved = {
      id: 'p1',
      name: 'Abaya',
      about: 'Black abaya',
      notes: null,
      collection: 'Autumn 26',
      category: null,
      sku: 'BA-042',
      status: 'active',
      tags: ['minimal'],
      photos: [photo('photo-1'), photo('photo-2')],
      references: [
        { id: 'own', author_id: 'brand-1', title: 'Mine', files: [], tags: [] },
        { id: 'theirs', author_id: 'ad-1', title: 'Theirs', files: [], tags: [] },
      ],
      deliverables: [
        {
          id: 'd1',
          name: 'Walk',
          type: 'video',
          assignee: null,
          status: 'to_shoot',
          due_date: null,
          brief: null,
        },
        {
          id: 'd2',
          name: 'Turn',
          type: 'image',
          assignee: null,
          status: 'approved',
          due_date: null,
          brief: null,
        },
      ],
      created_at: '2026-10-07T10:00:00Z',
      can_edit: true,
    }
    getReturns(saved)
    uploadsAs('file-new')
    const put = vi.spyOn(http, 'put').mockResolvedValue({ data: saved })
    const { wrapper, router } = await mountPage('/products/p1/edit')
    await flushPromises()

    expect(wrapper.get('input[placeholder="Enter product name"]').element).toHaveProperty(
      'value',
      'Abaya',
    )
    // Only the brand's own references are in the form.
    expect(wrapper.text()).toContain('Mine')
    expect(wrapper.text()).not.toContain('Theirs')

    await wrapper.get('[aria-label="Remove Photo 1"]').trigger('click')
    wrapper.getComponent(VDropzone).vm.$emit('select', [jpeg('new.jpg')])
    await wrapper.get('[aria-label="Remove Walk"]').trigger('click')
    await wrapper.get('[aria-label="Remove Mine"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(put).toHaveBeenCalledWith(
      '/products/p1',
      expect.objectContaining({
        name: 'Abaya',
        sku: 'BA-042',
        tags: ['minimal'],
        photo_ids: ['photo-2', 'file-new'],
        reference_ids: [],
        references: [],
        deliverable_ids: ['d2'],
        deliverables: [],
      }),
    )
    expect(router.currentRoute.value.fullPath).toBe('/products/p1')
  })

  it('sends someone else to the product page', async () => {
    getReturns({ id: 'p1', can_edit: false, photos: [], references: [], deliverables: [] })
    const { router } = await mountPage('/products/p1/edit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/products/p1')
  })
})
