import { uploadFile } from '@/shared/api'
import { createReference, type SavedReference } from '../api/references'
import type { ReferenceDraft } from './reference-draft'
import { saveReference, toCreateRequest } from './save-reference'

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  uploadFile: vi.fn(),
}))
vi.mock('../api/references', () => ({ createReference: vi.fn() }))

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

describe('saveReference', () => {
  afterEach(() => vi.clearAllMocks())

  it('creates the reference with the uploaded files', async () => {
    vi.mocked(uploadFile).mockResolvedValue({ id: 'f1' } as Awaited<ReturnType<typeof uploadFile>>)
    const saved = { id: 'r1' } as SavedReference
    vi.mocked(createReference).mockResolvedValue(saved)

    expect(await saveReference(draft())).toBe(saved)
    expect(uploadFile).toHaveBeenCalledWith(image)
    expect(createReference).toHaveBeenCalledWith(expect.objectContaining({ file_ids: ['f1'] }))
  })
})
