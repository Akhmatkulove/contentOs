import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { openAddDeliverable, type DeliverableContext } from '../model/add-deliverable'

const context: DeliverableContext = {
  products: [
    { id: 'p1', name: 'Black Abaya 042', collection: '', photoUrl: null },
    { id: 'p2', name: 'Sand Abaya 017', collection: '', photoUrl: null },
  ],
  team: [
    { id: 'amina', name: 'Amina', photo_url: null },
    { id: 'odina', name: 'Odina', photo_url: null },
  ],
  references: [
    { id: 'r1', title: 'Beach light', previewUrl: null },
    { id: 'r2', title: 'Walk', previewUrl: null },
  ],
}

let host: VueWrapper | undefined

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
async function open() {
  host = mount(VModalHost, { attachTo: document.body })
  const result = openAddDeliverable(context)
  // The modal is an async component: let its chunk load and render.
  await vi.dynamicImportSettled()
  await flushPromises()
  return { result }
}

const button = (text: string) =>
  [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === text)!
const field = (label: string) => {
  // A required label ends with an asterisk.
  const el = [...document.querySelectorAll('label')].find((l) =>
    l.textContent?.trim().startsWith(label),
  )!
  return document.getElementById(el.htmlFor) as HTMLInputElement
}
// The picker list is portalled to <body>.
const options = () =>
  [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((el) => el.textContent!.trim())
const option = (text: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (el) => el.textContent!.trim() === text,
  )!

async function click(el: HTMLElement) {
  el.click()
  await flushPromises()
}

async function pickProduct() {
  field('Product').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
  option('Sand Abaya 017').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  await flushPromises()
}

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

describe('AddDeliverableModal (shoot)', () => {
  it('asks for a name and a product before adding', async () => {
    await open()
    await click(button('Add deliverable'))
    expect(document.body.textContent).toContain('Enter the deliverable.')
    expect(document.body.textContent).toContain('Select a product.')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('offers the shoot products', async () => {
    await open()
    field('Product').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(options()).toEqual(['Black Abaya 042', 'Sand Abaya 017'])
  })

  it('offers the shoot team as assignees', async () => {
    await open()
    await click(field('Assignee'))
    expect(options()).toEqual(['AAmina', 'OOdina'])
  })

  it('takes all shoot references when none are picked', async () => {
    const { result } = await open()
    expect(field('References').textContent).toContain('All shoot references')
    const name = field('Deliverable')
    name.value = 'Fabric close-up'
    name.dispatchEvent(new Event('input'))
    await pickProduct()

    await click(button('Add deliverable'))
    expect((await result)?.references.map((reference) => reference.id)).toEqual(['r1', 'r2'])
  })

  it('offers the shoot references', async () => {
    await open()
    await click(field('References'))
    expect(options()).toEqual(['Beach light', 'Walk'])
  })

  it('adds a deliverable with several assignees and references', async () => {
    const { result } = await open()
    const name = field('Deliverable')
    name.value = 'Walking transition'
    name.dispatchEvent(new Event('input'))
    await pickProduct()

    await click(field('Assignee'))
    await click(option('AAmina'))
    await click(option('OOdina'))
    expect(field('Assignee').textContent).toContain('Amina +1')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    await click(field('References'))
    await click(option('Walk'))
    expect(field('References').textContent).toContain('Walk')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    await click(button('Add deliverable'))
    expect(await result).toMatchObject({
      name: 'Walking transition',
      product: { id: 'p2', name: 'Sand Abaya 017' },
      assignees: [{ id: 'amina' }, { id: 'odina' }],
      references: [{ id: 'r2', title: 'Walk' }],
      dueDate: '',
      status: 'to_shoot',
    })
  })
})
