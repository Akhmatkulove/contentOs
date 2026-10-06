import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { fetchReferenceFilters, fetchReferences } from '../api/references'
import { useReferencesList } from './references-list'

vi.mock('../api/references', () => ({
  fetchReferences: vi.fn(),
  fetchReferenceFilters: vi.fn(),
  setFavorite: vi.fn(),
}))

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
      counts: { all: 12, favorites: 3 },
    })
    vi.mocked(fetchReferenceFilters).mockResolvedValue({ products: [], authors: [], tags: [] })
  })
  afterEach(() => vi.mocked(fetchReferences).mockReset())

  it('labels the tabs with the counts from the list', async () => {
    const { list } = await setup()
    expect(list.scope.value).toBe('all')
    expect(list.tabs.value.map((tab) => `${tab.label} (${tab.count})`)).toEqual([
      'All references (12)',
      'Favorites (3)',
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

  it('keeps the cards on screen, dimmed, while another page loads', async () => {
    const { list } = await setup()
    vi.mocked(fetchReferences).mockReturnValue(new Promise(() => {}))

    list.page.value = 2
    await flushPromises()
    expect(list.loading.value).toBe(false)
    expect(list.refreshing.value).toBe(true)
  })
})
