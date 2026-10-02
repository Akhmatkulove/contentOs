import { flushPromises, mount } from '@vue/test-utils'
import VSelect from './v-select.vue'
import type { SelectOption } from './select-styles'

const collections: SelectOption[] = [
  { value: 'all', label: 'All collections' },
  { value: 'autumn-26', label: 'Autumn 26' },
  { value: 'resort-25', label: 'Résort 25' },
  { value: 'summer-25', label: 'Summer 25', disabled: true },
]

function mountSelect(props: Partial<InstanceType<typeof VSelect>['$props']> = {}) {
  const wrapper = mount(VSelect, {
    attachTo: document.body,
    props: {
      options: collections,
      label: 'Collection',
      placeholder: 'Select collection',
      modelValue: undefined,
      'onUpdate:modelValue': (value?: string): void => {
        void wrapper.setProps({ modelValue: value })
      },
      ...props,
    },
  })
  return wrapper
}

// Reka renders the dropdown into <body>, outside the wrapper.
const options = () => [...document.querySelectorAll('[role="option"]')]
const optionLabels = () => options().map((option) => option.textContent?.trim())

// jsdom has no scrollIntoView; Reka calls it on the highlighted option.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('VSelect', () => {
  it('links the label to the trigger and shows the placeholder', () => {
    const wrapper = mountSelect()
    const trigger = wrapper.get('button')
    expect(wrapper.get('label').attributes('for')).toBe(trigger.attributes('id'))
    expect(trigger.text()).toBe('Select collection')
  })

  it('shows the error and marks the trigger invalid', () => {
    const wrapper = mountSelect({ error: 'Pick a collection.' })
    const trigger = wrapper.get('button')
    const message = wrapper.get('p')
    expect(message.text()).toBe('Pick a collection.')
    expect(trigger.attributes('aria-invalid')).toBe('true')
    expect(trigger.attributes('aria-describedby')).toBe(message.attributes('id'))
  })

  it('opens the plain list from the keyboard and picks an option', async () => {
    const wrapper = mountSelect()
    await wrapper.get('button').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(optionLabels()).toEqual(['All collections', 'Autumn 26', 'Résort 25', 'Summer 25'])

    ;(options()[1] as HTMLElement).dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    await flushPromises()
    expect(wrapper.props('modelValue')).toBe('autumn-26')
    expect(wrapper.get('button').text()).toBe('Autumn 26')
  })

  describe('searchable', () => {
    async function open() {
      const wrapper = mountSelect({ searchable: true })
      await wrapper.get('button').trigger('click')
      await flushPromises()
      const search = document.querySelector('input') as HTMLInputElement
      return { wrapper, search }
    }

    async function type(search: HTMLInputElement, value: string) {
      search.value = value
      search.dispatchEvent(new Event('input'))
      await flushPromises()
    }

    it('focuses the search and filters ignoring case and accents', async () => {
      const { search } = await open()
      expect(document.activeElement).toBe(search)
      expect(optionLabels()).toHaveLength(4)

      await type(search, 'resort')
      expect(optionLabels()).toEqual(['Résort 25'])
    })

    it('says so when nothing matches', async () => {
      const { search } = await open()
      await type(search, 'winter')
      expect(options()).toHaveLength(0)
      expect(document.querySelector('[role="status"]')?.textContent?.trim()).toBe('Nothing found')
    })

    it('picks an option, closes and clears the search', async () => {
      const { wrapper, search } = await open()
      await type(search, 'aut')
      ;(options()[0] as HTMLElement).click()
      await flushPromises()

      expect(wrapper.props('modelValue')).toBe('autumn-26')
      expect(wrapper.get('button').text()).toBe('Autumn 26')
      expect(options()).toHaveLength(0)

      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect((document.querySelector('input') as HTMLInputElement).value).toBe('')
    })

    it('keeps the value when the selected option is picked again', async () => {
      const { wrapper } = await open()
      ;(options()[0] as HTMLElement).click()
      await flushPromises()
      await wrapper.get('button').trigger('click')
      await flushPromises()
      ;(options()[0] as HTMLElement).click()
      await flushPromises()
      expect(wrapper.props('modelValue')).toBe('all')
    })

    it('renders only the visible rows of a long list', async () => {
      const many = Array.from({ length: 500 }, (_, i) => ({
        value: `c${i}`,
        label: `Collection ${i}`,
      }))
      const wrapper = mountSelect({ searchable: true, options: many })
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(options().length).toBeLessThan(many.length)
    })
  })
})
