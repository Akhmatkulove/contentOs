import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  fetchReferenceCollections,
  fetchReferenceFilters,
  fetchReferences,
} from '@/entities/reference'
import { useReferencesList } from './references-list'

vi.mock('@/entities/reference', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/reference')>()),
  fetchReferences: vi.fn(),
  fetchReferenceCollections: vi.fn(),
  fetchReferenceFilters: vi.fn(),
}))
vi.mock('../api/references', () => ({ setFavorite: vi.fn() }))

async function setup(path = '/references') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/references', component: { render: () => null } }],
  })
  await router.push(path)
  let list!: ReturnType<typeof useReferencesList>
  mount(
    defineComponent({
      setup() {
        list = useReferencesList()
        return () => null
      },
    }),
    { global: { plugins: [router, createPinia(), PiniaColada] } },
  )
  await flushPromises()
  return { list, router }
}

describe('useReferencesList tabs', () => {
  beforeEach(() => {
    vi.mocked(fetchReferences).mockResolvedValue({
      items: [],
      total: 0,
      counts: { all: 12, mine: 5, favorites: 3, collections: 0 },
    })
    vi.mocked(fetchReferenceFilters).mockResolvedValue({ products: [], authors: [], tags: [] })
  })
  afterEach(() => vi.mocked(fetchReferences).mockReset())

  it('labels the tabs with the counts from the list', async () => {
    const { list } = await setup()
    expect(list.scope.value).toBe('all')
    expect(list.tabs.value.map((tab) => `${tab.label} (${tab.count})`)).toEqual([
      'All references (12)',
      'My references (5)',
      'Favorites (3)',
      'Collections (0)',
    ])
  })

  it('opens the tab from the URL', async () => {
    await setup('/references?tab=favorites')
    expect(fetchReferences).toHaveBeenCalledWith(expect.objectContaining({ scope: 'favorites' }))
  })

  it('switches the tab in the URL and loads its first page once', async () => {
    const { list, router } = await setup()
    list.page.value = 2
    await flushPromises()
    vi.mocked(fetchReferences).mockClear()

    list.scope.value = 'favorites'
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'favorites' })
    expect(list.page.value).toBe(1)
    expect(fetchReferences).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ scope: 'favorites', page: 1 }),
    )
  })

  it('reads the filters from the URL and writes them back under short names', async () => {
    const { list, router } = await setup('/references?type=video&product=p1&sort=oldest&page=3')
    expect(fetchReferences).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video', productId: 'p1', sort: 'oldest', page: 3 }),
    )

    list.filters.authorId = 'u1'
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({
      type: 'video',
      product: 'p1',
      creator: 'u1',
      sort: 'oldest',
    })
  })

  it('keeps the cards on screen, dimmed, while another page loads', async () => {
    const { list } = await setup()
    vi.mocked(fetchReferences).mockReturnValue(new Promise(() => {}))

    list.page.value = 2
    await flushPromises()
    expect(list.loading.value).toBe(false)
    expect(list.refreshing.value).toBe(true)
  })
})

describe('useReferencesList collections tab', () => {
  const counts = { all: 12, mine: 5, favorites: 3, collections: 2 }
  beforeEach(() => {
    vi.mocked(fetchReferences).mockResolvedValue({ items: [], total: 4, counts })
    vi.mocked(fetchReferenceCollections).mockResolvedValue({ items: [], total: 2, counts })
    vi.mocked(fetchReferenceFilters).mockResolvedValue({ products: [], authors: [], tags: [] })
  })
  afterEach(() => {
    vi.mocked(fetchReferences).mockReset()
    vi.mocked(fetchReferenceCollections).mockReset()
  })

  it('loads the collections with the search and filters, not the list', async () => {
    const { list } = await setup('/references?tab=collections&type=video&search=linen')
    expect(list.grouped.value).toBe(true)
    expect(fetchReferences).not.toHaveBeenCalled()
    expect(fetchReferenceCollections).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ search: 'linen', type: 'video', page: 1 }),
    )
    expect(list.total.value).toBe(2)
    expect(list.tabs.value.at(-1)).toEqual({ value: 'collections', label: 'Collections', count: 2 })
  })

  it('opens a collection as a list of the whole pool and closes it with another tab', async () => {
    const { list, router } = await setup('/references?tab=collections&page=2')
    list.openCollection('Summer 26')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'collections', collection: 'Summer 26' })
    expect(list.grouped.value).toBe(false)
    expect(fetchReferences).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ scope: 'all', collection: 'Summer 26', page: 1 }),
    )

    // Back to the page of collections it was opened from.
    list.closeCollection()
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'collections', page: '2' })

    list.openCollection('Summer 26')
    await flushPromises()
    list.scope.value = 'mine'
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'mine' })
    expect(list.collection.value).toBe('')
  })

  it('ignores a collection in the URL on other tabs', async () => {
    const { list } = await setup('/references?tab=mine&collection=Summer')
    expect(list.collection.value).toBe('')
    expect(fetchReferences).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'mine', collection: undefined }),
    )
  })
})
