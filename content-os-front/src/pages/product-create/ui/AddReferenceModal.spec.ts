import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { openAddReference } from '../model/add-reference'

let host: VueWrapper | undefined

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
const context = { product: 'Linen shirt', collection: 'Summer 26', creator: 'Acme' }

async function open() {
  host = mount(VModalHost, { attachTo: document.body })
  const result = openAddReference(context)
  // The modal is an async component: let its chunk load and render.
  await vi.dynamicImportSettled()
  await flushPromises()
  return { result }
}

const button = (text: string) =>
  [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === text)!
const field = (label: string) =>
  [...document.querySelectorAll('label')].find((el) => el.textContent?.trim() === label)

afterEach(() => {
  // Close and drop modals left open, without waiting for the exit animation.
  vi.useFakeTimers()
  closeAllModals()
  vi.runAllTimers()
  vi.useRealTimers()
  host?.unmount()
  host = undefined
  document.body.innerHTML = ''
})

describe('AddReferenceModal', () => {
  it('opens on file upload with the shared fields', async () => {
    await open()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Add reference')
    expect(button('Upload files').getAttribute('aria-checked')).toBe('true')
    expect(document.querySelector('input[type="file"]')).not.toBeNull()
    for (const label of ['Reference title', 'Type', 'Tags', 'Notes'])
      expect(field(label)).toBeDefined()
  })

  it('switches to a link field', async () => {
    await open()
    button('Paste link').click()
    await flushPromises()
    expect(button('Paste link').getAttribute('aria-checked')).toBe('true')
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(document.querySelector('input[type="url"]')).not.toBeNull()
  })

  it('shows product, collection and creator from the product, not editable', async () => {
    await open()
    for (const [label, value] of [
      ['Product', 'Linen shirt'],
      ['Collection', 'Summer 26'],
      ['Creator', 'Acme'],
    ]) {
      const input = document.getElementById(field(label)!.htmlFor) as HTMLInputElement
      expect(input.value).toBe(value)
      expect(input.disabled).toBe(true)
    }
  })

  it('asks for a file before adding', async () => {
    const { result } = await open()
    button('Add reference').click()
    await flushPromises()
    expect(document.body.textContent).toContain('Add at least one file.')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    void result
  })

  it('returns a link draft with the filled fields', async () => {
    const { result } = await open()
    button('Paste link').click()
    await flushPromises()
    const link = document.querySelector<HTMLInputElement>('input[type="url"]')!
    link.value = 'not a link'
    link.dispatchEvent(new Event('input'))
    button('Add reference').click()
    await flushPromises()
    expect(document.body.textContent).toContain('Enter a valid link.')

    link.value = ' https://www.instagram.com/p/abc/ '
    link.dispatchEvent(new Event('input'))
    const title = document.querySelector<HTMLInputElement>(
      'input[placeholder="Enter reference title"]',
    )!
    title.value = 'Beach light'
    title.dispatchEvent(new Event('input'))
    button('Add reference').click()

    expect(await result).toMatchObject({
      source: 'link',
      link: 'https://www.instagram.com/p/abc/',
      title: 'Beach light',
      files: [],
    })
  })

  it('closes on Cancel', async () => {
    const { result } = await open()
    button('Cancel').click()
    expect(await result).toBeUndefined()
  })
})
