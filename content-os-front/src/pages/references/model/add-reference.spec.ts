import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { useSessionStore, type Me } from '@/entities/session'
import { toast } from '@/shared/ui/toast'
import { openAddReference, saveReference, type ReferenceDraft } from '@/features/add-reference'
import { fetchProductOptions } from '../api/references'
import { useAddReference } from './add-reference'

vi.mock('@/features/add-reference', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/add-reference')>()),
  openAddReference: vi.fn(),
  saveReference: vi.fn(),
}))
vi.mock('../api/references', () => ({ fetchProductOptions: vi.fn() }))

const image = new File(['x'], 'a.jpg', { type: 'image/jpeg' })

function draft(overrides: Partial<ReferenceDraft> = {}): ReferenceDraft {
  return {
    id: 'd1',
    source: 'upload',
    files: [image],
    link: '',
    title: 'Linen',
    type: 'image',
    tags: ['linen'],
    notes: '',
    productId: 'p1',
    collection: 'Summer 26',
    favorite: true,
    ...overrides,
  }
}

describe('useAddReference', () => {
  function setup() {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSessionStore().set({ id: 'u1', name: 'Amina' } as Me)
    let added!: ReturnType<typeof useAddReference>
    mount(
      defineComponent({
        setup() {
          added = useAddReference()
          return () => null
        },
      }),
      { global: { plugins: [pinia, PiniaColada] } },
    )
    return added
  }

  beforeEach(() => {
    vi.mocked(fetchProductOptions).mockResolvedValue([{ id: 'p1', name: 'Abaya' }])
    vi.mocked(saveReference).mockResolvedValue({} as Awaited<ReturnType<typeof saveReference>>)
  })
  afterEach(() => vi.clearAllMocks())

  it('loads products on open, saves the draft and shows a toast', async () => {
    const success = vi.spyOn(toast, 'success')
    let options!: Parameters<typeof openAddReference>[0]
    vi.mocked(openAddReference).mockImplementation(async (opened) => {
      options = opened
      await flushPromises()
      await opened.save!(draft())
      return draft()
    })
    const { addReference } = setup()
    expect(fetchProductOptions).not.toHaveBeenCalled()
    const invalidate = vi.spyOn(useQueryCache(), 'invalidateQueries')

    await addReference()
    expect(options.creator).toBe('Amina')
    expect(fetchProductOptions).toHaveBeenCalledOnce()
    expect(saveReference).toHaveBeenCalledWith(draft())
    expect(invalidate).toHaveBeenCalledWith({ key: ['references'] })
    expect(success).toHaveBeenCalledWith('Reference added')
  })

  it('shows no toast when cancelled', async () => {
    const success = vi.spyOn(toast, 'success')
    vi.mocked(openAddReference).mockResolvedValue(undefined)
    await setup().addReference()
    expect(success).not.toHaveBeenCalled()
  })
})
