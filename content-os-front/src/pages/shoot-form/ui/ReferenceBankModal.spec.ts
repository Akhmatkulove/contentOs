import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { fetchReferenceFilters, fetchReferences, toReference } from '@/entities/reference'
import type { Schemas } from '@/shared/api'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { openReferenceBank } from '../model/browse-references'

vi.mock('@/entities/reference', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/reference')>()),
  fetchReferences: vi.fn(),
  fetchReferenceFilters: vi.fn(),
}))

function item(id: string, title: string): Schemas['ReferenceResponse'] {
  return {
    id,
    title,
    type: 'image',
    link: null,
    collection: null,
    notes: null,
    tags: ['Fabric'],
    product_id: null,
    author_id: 'u1',
    author: 'Studio',
    files: [],
    favorite: false,
    created_at: '2026-10-01T10:00:00Z',
  }
}

function page(items: Schemas['ReferenceResponse'][], total = items.length) {
  return { items, total, counts: { all: total, mine: 0, favorites: 0 } }
}

let host: VueWrapper | undefined

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
async function open(selected: ReturnType<typeof toReference>[] = []) {
  host = mount(VModalHost, {
    attachTo: document.body,
    global: { plugins: [createPinia(), PiniaColada] },
  })
  const result = openReferenceBank(selected)
  // The modal is an async component: let its chunk load and render.
  await vi.dynamicImportSettled()
  await flushPromises()
  return { result }
}

const button = (text: string) =>
  [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === text)!
const box = (title: string) =>
  document.querySelector<HTMLElement>(`[role="checkbox"][aria-label="Select ${title}"]`)!
const titles = () =>
  [...document.querySelectorAll('[role="dialog"] article h3')].map((h) => h.textContent?.trim())

beforeEach(() => {
  vi.mocked(fetchReferenceFilters).mockResolvedValue({
    products: [{ id: 'p1', name: 'Black Abaya 042' }],
    authors: [],
    tags: ['Fabric'],
  })
})

afterEach(() => {
  // Close and drop modals left open, without waiting for the exit animation.
  vi.useFakeTimers()
  closeAllModals()
  vi.runAllTimers()
  vi.useRealTimers()
  host?.unmount()
  host = undefined
  document.body.innerHTML = ''
  vi.mocked(fetchReferences).mockReset()
})

describe('ReferenceBankModal', () => {
  it('lists the pool and ticks the references the shoot has', async () => {
    vi.mocked(fetchReferences).mockResolvedValue(
      page([item('r1', 'Linen texture'), item('r2', 'Turn movement')]),
    )

    await open([toReference(item('r2', 'Turn movement'))])

    expect(fetchReferences).toHaveBeenCalledWith(
      expect.objectContaining({ search: '', scope: 'all', page: 1, perPage: 30, sort: 'newest' }),
    )
    expect(titles()).toEqual(['Linen texture', 'Turn movement'])
    expect(box('Linen texture').getAttribute('aria-checked')).toBe('false')
    expect(box('Turn movement').getAttribute('aria-checked')).toBe('true')
    expect(document.body.textContent).toContain('1 selected')
  })

  it('closes with the new pick on "Save"', async () => {
    vi.mocked(fetchReferences).mockResolvedValue(page([item('r1', 'Linen texture')]))
    const { result } = await open()

    box('Linen texture').click()
    await flushPromises()
    button('Save').click()

    expect((await result)?.map((reference) => reference.id)).toEqual(['r1'])
  })

  it('changes nothing when cancelled', async () => {
    vi.mocked(fetchReferences).mockResolvedValue(page([item('r1', 'Linen texture')]))
    const { result } = await open()

    box('Linen texture').click()
    button('Cancel').click()

    expect(await result).toBeUndefined()
  })

  it('loads more references on request', async () => {
    vi.mocked(fetchReferences)
      .mockResolvedValueOnce(page([item('r1', 'First')], 31))
      .mockResolvedValueOnce(page([item('r31', 'Last')], 31))
    await open()

    button('Load more').click()
    await flushPromises()

    expect(fetchReferences).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    expect(titles()).toEqual(['First', 'Last'])
  })

  it('says when nothing matches', async () => {
    vi.mocked(fetchReferences).mockResolvedValue(page([]))
    await open()

    expect(document.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'No references match your search or filters.',
    )
  })
})
