import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { openAddDeliverable } from '../model/add-deliverable'

vi.mock('../api/team', () => ({
  fetchArtDirectors: vi.fn(async () => [{ id: 'ad-1', name: 'Amina', photo_url: null }]),
}))

let host: VueWrapper | undefined

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
async function open() {
  host = mount(VModalHost, {
    attachTo: document.body,
    global: { plugins: [createPinia(), PiniaColada] },
  })
  const result = openAddDeliverable({ product: 'Black Abaya 042' })
  // The modal is an async component: let its chunk load and render.
  await vi.dynamicImportSettled()
  await flushPromises()
  return { result }
}

const button = (text: string) =>
  [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === text)!
const input = (label: string) => {
  // A required label ends with an asterisk.
  const el = [...document.querySelectorAll('label')].find((l) =>
    l.textContent?.trim().startsWith(label),
  )!
  return document.getElementById(el.htmlFor) as HTMLInputElement
}

// Opens the select and picks its option by text.
async function pick(label: string, text: string) {
  input(label).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
  ;[...document.querySelectorAll('[role="option"]')]
    .find((el) => el.textContent?.trim() === text)!
    .dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
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

describe('AddDeliverableModal', () => {
  it('fills the product from the page, not editable', async () => {
    await open()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Add deliverable')
    expect(input('Product').value).toBe('Black Abaya 042')
    expect(input('Product').disabled).toBe(true)
  })

  it('offers the brand art directors as assignees', async () => {
    await open()
    input('Assignee').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    const options = [...document.querySelectorAll('[role="option"]')]
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Amina'])
  })

  it('asks for a name, a type and an assignee before adding', async () => {
    await open()
    button('Add deliverable').click()
    await flushPromises()
    expect(document.body.textContent).toContain('Enter the deliverable.')
    expect(document.body.textContent).toContain('Select a type.')
    expect(document.body.textContent).toContain('Select an assignee.')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('returns a draft with the filled fields', async () => {
    const { result } = await open()
    const name = input('Deliverable')
    name.value = '  Walking transition '
    name.dispatchEvent(new Event('input'))
    const brief = input('Brief')
    brief.value = 'Slow walk to the window'
    brief.dispatchEvent(new Event('input'))
    await pick('Type', 'Image')
    await pick('Assignee', 'Amina')
    button('Add deliverable').click()
    await flushPromises()

    expect(await result).toEqual({
      id: expect.any(String),
      name: 'Walking transition',
      type: 'image',
      assignee: { id: 'ad-1', name: 'Amina', photo_url: null },
      status: 'to_shoot',
      dueDate: '',
      brief: 'Slow walk to the window',
    })
  })

  it('closes with nothing on Cancel', async () => {
    const { result } = await open()
    button('Cancel').click()
    expect(await result).toBeUndefined()
  })
})
