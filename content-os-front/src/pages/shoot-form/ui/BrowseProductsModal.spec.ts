import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { fetchProductsPage } from '../api/products'
import { openBrowseProducts } from '../model/browse-products'
import type { ShootProduct } from '../model/shoot-draft'

vi.mock('../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/products')>()),
  fetchProductsPage: vi.fn(),
}))

function item(id: string, name: string) {
  return {
    id,
    name,
    collection: 'Autumn 26',
    sku: null,
    status: 'active' as const,
    photo: null,
    created_at: '2026-10-01T10:00:00Z',
  }
}

let host: VueWrapper | undefined

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
async function open(selected: ShootProduct[] = []) {
  host = mount(VModalHost, {
    attachTo: document.body,
    global: { plugins: [createPinia(), PiniaColada] },
  })
  const result = openBrowseProducts(selected)
  // The modal is an async component: let its chunk load and render.
  await vi.dynamicImportSettled()
  await flushPromises()
  return { result }
}

const button = (text: string) =>
  [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === text)!
const box = (name: string) =>
  [...document.querySelectorAll('label')]
    .find((label) => label.textContent?.includes(name))!
    .querySelector<HTMLElement>('[role="checkbox"]')!
const names = () =>
  [...document.querySelectorAll('[role="dialog"] li label')].map((label) =>
    label.querySelector('span.text-p1')?.textContent?.trim(),
  )

afterEach(() => {
  // Close and drop modals left open, without waiting for the exit animation.
  vi.useFakeTimers()
  closeAllModals()
  vi.runAllTimers()
  vi.useRealTimers()
  host?.unmount()
  host = undefined
  document.body.innerHTML = ''
  vi.mocked(fetchProductsPage).mockReset()
})

describe('BrowseProductsModal', () => {
  it('lists the products and ticks the ones the shoot has', async () => {
    vi.mocked(fetchProductsPage).mockResolvedValue({
      items: [item('p1', 'Black Abaya 042'), item('p2', 'Cream Dress 011')],
      total: 2,
    })

    await open([{ id: 'p2', name: 'Cream Dress 011', collection: 'Autumn 26', photoUrl: null }])

    expect(fetchProductsPage).toHaveBeenCalledWith('', 1, 30)
    expect(names()).toEqual(['Black Abaya 042', 'Cream Dress 011'])
    expect(box('Black Abaya 042').getAttribute('aria-checked')).toBe('false')
    expect(box('Cream Dress 011').getAttribute('aria-checked')).toBe('true')
    expect(document.body.textContent).toContain('1 selected')
    expect(button('Load more')).toBeUndefined()
  })

  it('closes with the new pick on "Save"', async () => {
    vi.mocked(fetchProductsPage).mockResolvedValue({
      items: [item('p1', 'Black Abaya 042'), item('p2', 'Cream Dress 011')],
      total: 2,
    })
    const { result } = await open()

    box('Black Abaya 042').click()
    await flushPromises()
    expect(document.body.textContent).toContain('1 selected')
    button('Save').click()

    expect(await result).toEqual([
      { id: 'p1', name: 'Black Abaya 042', collection: 'Autumn 26', photoUrl: null },
    ])
  })

  it('changes nothing when cancelled', async () => {
    vi.mocked(fetchProductsPage).mockResolvedValue({ items: [item('p1', 'Abaya')], total: 1 })
    const { result } = await open()

    box('Abaya').click()
    button('Cancel').click()

    expect(await result).toBeUndefined()
  })

  it('loads more products on request', async () => {
    vi.mocked(fetchProductsPage)
      .mockResolvedValueOnce({ items: [item('p1', 'First')], total: 31 })
      .mockResolvedValueOnce({ items: [item('p31', 'Last')], total: 31 })
    await open()

    button('Load more').click()
    await flushPromises()

    expect(fetchProductsPage).toHaveBeenLastCalledWith('', 2, 30)
    expect(names()).toEqual(['First', 'Last'])
    expect(button('Load more')).toBeUndefined()
  })

  it('says when nothing is assigned yet', async () => {
    vi.mocked(fetchProductsPage).mockResolvedValue({ items: [], total: 0 })
    await open()

    expect(document.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'No products are assigned to you yet.',
    )
  })
})
