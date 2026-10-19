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

  // The modal calls `save` with the draft, then closes with it.
  function addedThroughModal(added: ReferenceDraft) {
    vi.mocked(openAddReference).mockImplementationOnce(async (opened) => {
      await opened.save!(added)
      return added
    })
  }

  it('saves a new reference to the pool from the modal and ticks it', async () => {
    let options!: Parameters<typeof openAddReference>[0]
    vi.mocked(openAddReference).mockImplementation(async (opened) => {
      options = opened
      await opened.save!(draft('d1'))
      return draft('d1')
    })
    vi.mocked(saveReference).mockImplementation(async (saved) => savedFrom(saved.id))
    const shoot = setup()
    const invalidate = vi.spyOn(useQueryCache(), 'invalidateQueries')

    await shoot.addReference()
    expect(options.creator).toBe('Amina')
    expect((options.products as () => unknown)()).toEqual([{ value: 'p1', label: 'Abaya' }])
    expect(saveReference).toHaveBeenCalledExactlyOnceWith(draft('d1'))
    expect(invalidate).toHaveBeenCalledWith({ key: ['references'] })
    expect(shoot.references.value).toMatchObject([{ id: 'saved-d1', title: 'd1', author: 'Amina' }])
    expect(shoot.selected.value).toEqual(['saved-d1'])
  })

  it('adds nothing when the modal is cancelled or the save fails', async () => {
    vi.mocked(openAddReference).mockResolvedValueOnce(undefined)
    vi.mocked(saveReference).mockRejectedValueOnce(new Error('offline'))
    vi.mocked(openAddReference).mockImplementationOnce(async (opened) => {
      // The modal stays open on a failed save; then it is closed.
      await opened.save!(draft('d1')).catch(() => {})
      return undefined
    })
    const shoot = setup()

    await shoot.addReference()
    await shoot.addReference()
    expect(shoot.references.value).toEqual([])
    expect(shoot.selected.value).toEqual([])
  })

  it('puts new references first and lets the bank pick replace them', async () => {
    addedThroughModal(draft('d1'))
    vi.mocked(saveReference).mockImplementation(async (saved) => savedFrom(saved.id))
    vi.mocked(openReferenceBank).mockResolvedValue([bankReference])
    const shoot = setup()
    shoot.references.value = [bankReference]
    shoot.selected.value = ['b1']

    await shoot.addReference()
    expect(shoot.references.value.map((reference) => reference.id)).toEqual(['saved-d1', 'b1'])
    expect(shoot.selected.value).toEqual(['b1', 'saved-d1'])

    await shoot.browse()
    expect(vi.mocked(openReferenceBank).mock.calls[0]![0].map((reference) => reference.id)).toEqual(
      ['saved-d1', 'b1'],
    )
    expect(shoot.references.value).toEqual([bankReference])
    expect(shoot.selected.value).toEqual(['b1'])
  })
})
