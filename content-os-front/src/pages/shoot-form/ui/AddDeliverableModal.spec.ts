import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { fetchProductDeliverables } from '../api/shoots'
import { openAddDeliverable, type DeliverableContext } from '../model/add-deliverable'

vi.mock('../api/shoots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/shoots')>()),
  fetchProductDeliverables: vi.fn(),
}))

const context: DeliverableContext = {
  products: [
    { id: 'p1', name: 'Black Abaya 042', collection: '', photoUrl: null, archived: false },
    { id: 'p2', name: 'Sand Abaya 017', collection: '', photoUrl: null, archived: false },
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

// The brand's deliverables assigned to the art director in the shoot's products.
beforeEach(() => {
  vi.mocked(fetchProductDeliverables).mockResolvedValue([
    {
      id: 'pd1',
      product_id: 'p1',
      name: 'Hero walk',
      type: 'video',
      brief: null,
      status: 'to_shoot',
      due_date: '2024-09-20',
      shoots: [],
    },
    {
      id: 'pd2',
      product_id: 'p2',
      name: 'Fabric detail',
      type: 'image',
      brief: null,
      status: 'to_shoot',
      due_date: null,
      shoots: [{ id: 's9', name: 'Shoot 04', date: '2024-09-10' }],
    },
  ])
})

let host: VueWrapper | undefined

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
async function open(extra: Partial<DeliverableContext> = {}) {
  host = mount(VModalHost, {
    attachTo: document.body,
    global: { plugins: [createPinia(), PiniaColada] },
  })
  const result = openAddDeliverable({ ...context, ...extra })
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

// Opens the searchable select (a popover, opened by a click) and picks its option by text.
async function choose(label: string, text: string) {
  await click(field(label))
  await click(option(text))
}

// Opens the select and picks its option by text.
async function pick(label: string, text: string) {
  field(label).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
  option(text).dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
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
  it('asks for a product deliverable, a name and a type before adding', async () => {
    await open()
    await click(button('Add deliverable'))
    expect(document.body.textContent).toContain('Enter the deliverable.')
    expect(document.body.textContent).toContain('Select a type.')
    expect(document.body.textContent).toContain('Select the product deliverable.')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it("offers the brand's deliverables of the shoot products", async () => {
    await open()
    expect(fetchProductDeliverables).toHaveBeenCalledWith(['p1', 'p2'])
    await click(field('Product deliverable'))
    expect(options()).toEqual([
      'Black Abaya 042 · Hero walk',
      'Sand Abaya 017 · Fabric detail · In Shoot 04',
    ])
  })

  it("fills in the brand's name, type and due date, keeping what was typed", async () => {
    const { result } = await open()
    await choose('Product deliverable', 'Black Abaya 042 · Hero walk')
    expect(field('Deliverable').value).toBe('Hero walk')

    const name = field('Deliverable')
    name.value = 'Hero walk, slow'
    name.dispatchEvent(new Event('input'))
    await choose('Product deliverable', 'Sand Abaya 017 · Fabric detail · In Shoot 04')

    await click(button('Add deliverable'))
    expect(await result).toMatchObject({
      name: 'Hero walk, slow',
      type: 'image',
      // The first pick's date was not changed by hand, so the second pick's replaces it.
      dueDate: '',
      product: { id: 'p2' },
      productDeliverable: { id: 'pd2', name: 'Fabric detail' },
    })
  })

  it('starts with the deliverable planned from the backlog', async () => {
    const { result } = await open({ productDeliverableId: 'pd1' })
    expect(field('Product deliverable').textContent).toContain('Black Abaya 042 · Hero walk')
    expect(field('Deliverable').value).toBe('Hero walk')

    await click(button('Add deliverable'))
    expect(await result).toMatchObject({
      name: 'Hero walk',
      type: 'video',
      dueDate: '2024-09-20',
      productDeliverable: { id: 'pd1' },
    })
  })

  it('asks for a pick when the planned deliverable is no longer offered', async () => {
    await open({ productDeliverableId: 'gone' })
    await click(button('Add deliverable'))
    expect(document.body.textContent).toContain('Select the product deliverable.')
  })

  it('keeps a new deliverable of an archived product at To shoot', async () => {
    const products = context.products.map((product) =>
      product.id === 'p2' ? { ...product, archived: true } : product,
    )
    const { result } = await open({ products })
    await choose('Product deliverable', 'Sand Abaya 017 · Fabric detail · In Shoot 04')
    expect(field('Status').disabled).toBe(true)

    await click(button('Add deliverable'))
    expect(await result).toMatchObject({ status: 'to_shoot', product: { id: 'p2' } })
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
    await pick('Type', 'Video')
    await choose('Product deliverable', 'Sand Abaya 017 · Fabric detail · In Shoot 04')

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
    await pick('Type', 'Video')
    await choose('Product deliverable', 'Sand Abaya 017 · Fabric detail · In Shoot 04')

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
      type: 'video',
      product: { id: 'p2', name: 'Sand Abaya 017' },
      productDeliverable: { id: 'pd2', name: 'Fabric detail' },
      assignees: [{ id: 'amina' }, { id: 'odina' }],
      references: [{ id: 'r2', title: 'Walk' }],
      dueDate: '',
      status: 'to_shoot',
    })
  })
})
