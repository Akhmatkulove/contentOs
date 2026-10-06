import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { openFiltersSheet } from '../model/filters-sheet'
import { collectionOptions, defaultFilters } from '../model/product-filters'

let host: VueWrapper | undefined

const collections = collectionOptions({ collections: ['Autumn 26', 'Summer 26'] })

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the sheet to close.
async function open() {
  host = mount(VModalHost, { attachTo: document.body })
  const result = openFiltersSheet({ ...defaultFilters }, collections)
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

describe('products FiltersSheet', () => {
  it('starts from the current filters', async () => {
    await open()
    expect(radio('Collection', 'All collections').getAttribute('aria-checked')).toBe('true')
    expect(radio('Status', 'All statuses').getAttribute('aria-checked')).toBe('true')
    expect(radio('Sort by', 'Newest first').getAttribute('aria-checked')).toBe('true')
  })

  it('applies the picked filters', async () => {
    const { result } = await open()
    radio('Collection', 'Summer 26').click()
    radio('Status', 'Archived').click()
    radio('Sort by', 'Name: A–Z').click()
    await flushPromises()
    button('Apply').click()
    expect(await result).toEqual({ collection: 'Summer 26', status: 'archived', sort: 'name_asc' })
  })

  it('changes nothing on Cancel', async () => {
    const { result } = await open()
    radio('Status', 'Active').click()
    button('Cancel').click()
    expect(await result).toBeUndefined()
  })
})
