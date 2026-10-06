import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { openFiltersSheet } from '../model/filters-sheet'
import { defaultFilters, filterOptions } from '../model/reference-filters'

let host: VueWrapper | undefined

const options = filterOptions({
  products: [
    { id: 'p1', name: 'Black Abaya 042' },
    { id: 'p2', name: 'Cream Dress 011' },
  ],
  authors: [{ id: 'u1', name: 'Acme', photo_url: null }],
  tags: ['pose'],
})

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the sheet to close.
async function open() {
  host = mount(VModalHost, { attachTo: document.body })
  const result = openFiltersSheet({ ...defaultFilters }, options)
  await vi.dynamicImportSettled()
  await flushPromises()
  return { result }
}

const group = (label: string) =>
  [...document.querySelectorAll('[role="radiogroup"]')].find(
    (el) => document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent === label,
  )!
const radio = (label: string, option: string) =>
  [...group(label).querySelectorAll<HTMLElement>('[role="radio"]')].find(
    (el) => el.textContent?.trim() === option,
  )!
const button = (text: string) =>
  [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === text)!

afterEach(() => {
  vi.useFakeTimers()
  closeAllModals()
  vi.runAllTimers()
  vi.useRealTimers()
  host?.unmount()
  host = undefined
  document.body.innerHTML = ''
})

describe('FiltersSheet', () => {
  it('shows the sections with "All …" picked, without a shoot section', async () => {
    await open()
    expect(radio('Type', 'All types').getAttribute('aria-checked')).toBe('true')
    expect(radio('Sort by', 'Newest first').getAttribute('aria-checked')).toBe('true')
    expect(radio('Creator', 'AAcme')).toBeDefined()
    expect(document.body.textContent).not.toContain('Shoot')
  })

  it('searches a section', async () => {
    await open()
    const input = group('Product').parentElement!.querySelector('input')!
    input.value = 'cream'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    const labels = [...group('Product').querySelectorAll('[role="radio"]')].map((el) =>
      el.textContent?.trim(),
    )
    // The picked "All products" stays in the list.
    expect(labels).toEqual(['All products', 'Cream Dress 011'])
  })

  it('applies the picked filters', async () => {
    const { result } = await open()
    radio('Type', 'Video').click()
    radio('Product', 'Black Abaya 042').click()
    radio('Sort by', 'Name: A–Z').click()
    await flushPromises()
    button('Apply').click()
    expect(await result).toEqual({
      ...defaultFilters,
      type: 'video',
      productId: 'p1',
      sort: 'title_asc',
    })
  })

  it('changes nothing on Cancel', async () => {
    const { result } = await open()
    radio('Type', 'Video').click()
    button('Cancel').click()
    expect(await result).toBeUndefined()
  })
})
