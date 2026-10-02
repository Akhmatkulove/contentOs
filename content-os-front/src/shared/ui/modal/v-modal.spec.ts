import { defineComponent, h } from 'vue'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import VModal from './v-modal.vue'
import VModalHost from './v-modal-host.vue'
import { closeAllModals, modals, openModal } from './modal-stack'

// A modal as pages write them: VModal at the root, emit('close', result) to finish.
const AddReferenceModal = defineComponent({
  props: { description: { type: String, default: undefined } },
  emits: { close: (title?: string) => title === undefined || typeof title === 'string' },
  setup(props, { emit }) {
    return () =>
      h(
        VModal,
        { title: 'Add reference', description: props.description },
        {
          default: () => h('input', { 'aria-label': 'Reference title' }),
          footer: () =>
            h(
              'button',
              { type: 'button', onClick: () => emit('close', 'Fabric close-up') },
              'Save',
            ),
        },
      )
  },
})

// Returns the pending result in an object: awaiting a bare promise here
// would wait for the modal to close.
let host: VueWrapper | undefined

async function open(description?: string) {
  host = mount(VModalHost, { attachTo: document.body })
  const result = openModal(AddReferenceModal, { description })
  await flushPromises()
  return { result }
}

// Compile-time only: openModal() takes the modal's own props.
export function typeChecks() {
  // @ts-expect-error description is a string
  void openModal(AddReferenceModal, { description: 1 })
}

// Reka renders the dialog into <body>.
const dialog = () => document.querySelector('[role="dialog"]')
const isOpen = () => dialog()?.getAttribute('data-state') === 'open'
// Both close controls are in the DOM; CSS shows one per breakpoint.
const grabber = () => new DOMWrapper(document.querySelectorAll('[aria-label="Close"]')[0]!)
const closeButton = () => new DOMWrapper(document.querySelectorAll('[aria-label="Close"]')[1]!)
const saveButton = () =>
  [...document.querySelectorAll('button')].find((button) => button.textContent === 'Save')!

// jsdom has no PointerEvent; a MouseEvent carries clientY just the same.
async function pointer(type: 'pointerdown' | 'pointerup', clientY: number) {
  grabber().element.dispatchEvent(new MouseEvent(type, { clientY, bubbles: true }))
  await flushPromises()
}

// jsdom has no pointer capture.
beforeAll(() => {
  Element.prototype.setPointerCapture = vi.fn()
})

afterEach(() => {
  host?.unmount()
  host = undefined
  modals.splice(0)
  document.body.innerHTML = ''
})

describe('VModal', () => {
  it('opens from code and resolves with what the modal closed with', async () => {
    const { result } = await open()
    expect(isOpen()).toBe(true)
    saveButton().click()
    // Typed from the modal's emits.
    const title: string | undefined = await result
    expect(title).toBe('Fabric close-up')
  })

  it('resolves with undefined when dismissed', async () => {
    const { result } = await open()
    await closeButton().trigger('click')
    expect(await result).toBeUndefined()
    expect(isOpen()).toBe(false)
  })

  it('removes the modal after the exit animation', async () => {
    await open()
    vi.useFakeTimers()
    closeAllModals()
    expect(modals).toHaveLength(1)
    vi.runAllTimers()
    vi.useRealTimers()
    expect(modals).toHaveLength(0)
  })

  it('labels the dialog with the title and description', async () => {
    await open('Upload or save a new visual reference.')
    const el = dialog()!
    const titleId = el.getAttribute('aria-labelledby')!
    const descriptionId = el.getAttribute('aria-describedby')!
    expect(document.getElementById(titleId)?.textContent).toBe('Add reference')
    expect(document.getElementById(descriptionId)?.textContent?.trim()).toBe(
      'Upload or save a new visual reference.',
    )
  })

  it('drops aria-describedby without a description', async () => {
    await open()
    expect(dialog()!.hasAttribute('aria-describedby')).toBe(false)
  })

  it('closes on a tap on the grabber', async () => {
    await open()
    await pointer('pointerdown', 100)
    await pointer('pointerup', 102)
    await grabber().trigger('click')
    expect(isOpen()).toBe(false)
  })

  it('closes on a pull down on the grabber', async () => {
    await open()
    await pointer('pointerdown', 100)
    await pointer('pointerup', 160)
    expect(isOpen()).toBe(false)
  })

  it('stays open after a pull up, even if the browser fires a click', async () => {
    await open()
    await pointer('pointerdown', 100)
    await pointer('pointerup', 40)
    await grabber().trigger('click')
    expect(isOpen()).toBe(true)
  })

  it('closes on Escape', async () => {
    await open()
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await flushPromises()
    expect(isOpen()).toBe(false)
  })

  it('refuses to render outside openModal()', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => mount(VModal, { props: { title: 'Add reference' } })).toThrow(/openModal/)
  })
})
