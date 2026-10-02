import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { openAddReference } from '../model/add-reference'

let host: VueWrapper | undefined

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
async function open() {
  host = mount(VModalHost, { attachTo: document.body })
  const result = openAddReference()
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
    expect(button('Upload files').getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('input[type="file"]')).not.toBeNull()
    for (const label of ['Reference title', 'Type', 'Product', 'Shoot', 'Creator', 'Tags', 'Notes'])
      expect(field(label)).toBeDefined()
  })

  it('switches to a link field', async () => {
    await open()
    button('Paste link').click()
    await flushPromises()
    expect(button('Paste link').getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(document.querySelector('input[type="url"]')).not.toBeNull()
  })

  it('closes on Cancel', async () => {
    const { result } = await open()
    button('Cancel').click()
    expect(await result).toBeUndefined()
  })
})
