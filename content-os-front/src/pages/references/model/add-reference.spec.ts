import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { useSessionStore, type Me } from '@/entities/session'
import { openAddReference, type ReferenceDraft } from '@/features/add-reference'
import { uploadFile } from '@/shared/api'
import { toast } from '@/shared/ui/toast'
import { createReference, fetchProductOptions } from '../api/references'
import { toCreateRequest, useAddReference } from './add-reference'

vi.mock('@/features/add-reference', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/add-reference')>()),
  openAddReference: vi.fn(),
}))
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  uploadFile: vi.fn(),
}))
vi.mock('../api/references', () => ({
  createReference: vi.fn(),
  fetchProductOptions: vi.fn(),
}))

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

describe('toCreateRequest', () => {
  it('adds product, collection and favorite to the common request', () => {
    expect(toCreateRequest(draft(), ['f1'])).toEqual({
      title: 'Linen',
      type: 'image',
      tags: ['linen'],
      notes: null,
      file_ids: ['f1'],
      product_id: 'p1',
      collection: 'Summer 26',
      favorite: true,
    })
    expect(toCreateRequest(draft({ productId: undefined, collection: '' }), [])).toMatchObject({
      product_id: null,
      collection: null,
    })
  })
})

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
    vi.mocked(uploadFile).mockResolvedValue({ id: 'f1' } as Awaited<ReturnType<typeof uploadFile>>)
    vi.mocked(createReference).mockResolvedValue()
  })
  afterEach(() => vi.clearAllMocks())

  it('loads products on open, saves with the uploaded files and shows a toast', async () => {
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
    expect(createReference).toHaveBeenCalledWith(expect.objectContaining({ file_ids: ['f1'] }))
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
