import { PiniaColada, useQueryCache } from '@pinia/colada'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import type { Reference } from '@/entities/reference'
import { useSessionStore, type Me } from '@/entities/session'
import {
  openAddReference,
  saveReference,
  type ReferenceDraft,
  type SavedReference,
} from '@/features/add-reference'
import { openReferenceBank } from './browse-references'
import type { ShootProduct } from './shoot-draft'
import { referenceProductOptions, useShootReferences } from './shoot-references'

vi.mock('@/features/add-reference', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/add-reference')>()),
  openAddReference: vi.fn(),
  saveReference: vi.fn(),
}))
vi.mock('./browse-references', () => ({ openReferenceBank: vi.fn() }))

const abaya: ShootProduct = { id: 'p1', name: 'Abaya', collection: '', photoUrl: null }

function draft(id: string): ReferenceDraft {
  return {
    id,
    source: 'link',
    files: [],
    link: `https://example.com/${id}`,
    title: id,
    type: undefined,
    tags: [],
    notes: '',
    productId: undefined,
    collection: '',
    favorite: false,
  }
}

function savedFrom(id: string): SavedReference {
  return {
    id: `saved-${id}`,
    title: id,
    type: null,
    link: `https://example.com/${id}`,
    collection: null,
    notes: null,
    tags: [],
    product_id: null,
    author_id: 'u1',
    author: 'Amina',
    files: [],
    favorite: false,
    created_at: '2026-10-08T00:00:00Z',
  }
}

const bankReference = { id: 'b1', title: 'Bank' } as Reference

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().set({ id: 'u1', name: 'Amina' } as Me)
  let shoot!: ReturnType<typeof useShootReferences>
  mount(
    defineComponent({
      setup() {
        shoot = useShootReferences(() => [abaya])
        return () => null
      },
    }),
    { global: { plugins: [pinia, PiniaColada] } },
  )
  return shoot
}

describe('referenceProductOptions', () => {
  it('offers the shoot products by name', () => {
    expect(referenceProductOptions([abaya])).toEqual([{ value: 'p1', label: 'Abaya' }])
  })
})

describe('useShootReferences', () => {
  afterEach(() => vi.clearAllMocks())

  it('adds a ticked draft, with the user as the creator and the shoot products', async () => {
    let options!: Parameters<typeof openAddReference>[0]
    vi.mocked(openAddReference).mockImplementation(async (opened) => {
      options = opened
      return draft('d1')
    })
    const shoot = setup()

    await shoot.addReference()
    expect(options.creator).toBe('Amina')
    expect(options.save).toBeUndefined()
    expect((options.products as () => unknown)()).toEqual([{ value: 'p1', label: 'Abaya' }])
    expect(shoot.references.value).toMatchObject([{ id: 'd1', title: 'd1', author: 'Amina' }])
    expect(shoot.selected.value).toEqual(['d1'])
    expect(saveReference).not.toHaveBeenCalled()
  })

  it('keeps drafts when the bank pick replaces the saved references', async () => {
    vi.mocked(openAddReference).mockResolvedValue(draft('d1'))
    vi.mocked(openReferenceBank).mockResolvedValue([bankReference])
    const shoot = setup()
    await shoot.addReference()

    await shoot.browse()
    expect(openReferenceBank).toHaveBeenCalledWith([])
    expect(shoot.references.value.map((reference) => reference.id)).toEqual(['d1', 'b1'])
    expect(shoot.selected.value).toEqual(['d1', 'b1'])
  })

  it('saves only the ticked drafts and keeps them ticked as saved references', async () => {
    vi.mocked(openAddReference)
      .mockResolvedValueOnce(draft('d1'))
      .mockResolvedValueOnce(draft('d2'))
    vi.mocked(saveReference).mockImplementation(async (saved) => savedFrom(saved.id))
    const shoot = setup()
    await shoot.addReference()
    await shoot.addReference()
    shoot.selected.value = ['d2']
    const invalidate = vi.spyOn(useQueryCache(), 'invalidateQueries')

    await shoot.saveDrafts()
    expect(saveReference).toHaveBeenCalledExactlyOnceWith(draft('d2'))
    expect(shoot.references.value.map((reference) => reference.id)).toEqual(['d1', 'saved-d2'])
    expect(shoot.selected.value).toEqual(['saved-d2'])
    expect(invalidate).toHaveBeenCalledWith({ key: ['references'] })
  })

  it('does not save a draft twice after a failure', async () => {
    vi.mocked(openAddReference)
      .mockResolvedValueOnce(draft('d1'))
      .mockResolvedValueOnce(draft('d2'))
    vi.mocked(saveReference)
      .mockResolvedValueOnce(savedFrom('d1'))
      .mockRejectedValueOnce(new Error('offline'))
    const shoot = setup()
    await shoot.addReference()
    await shoot.addReference()

    await expect(shoot.saveDrafts()).rejects.toThrow('offline')
    vi.mocked(saveReference).mockResolvedValueOnce(savedFrom('d2'))
    await shoot.saveDrafts()
    expect(vi.mocked(saveReference).mock.calls.map(([saved]) => saved.id)).toEqual([
      'd1',
      'd2',
      'd2',
    ])
    expect(shoot.selected.value).toEqual(['saved-d1', 'saved-d2'])
  })
})
