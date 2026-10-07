import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import VDatePicker from './v-date-picker.vue'

function mountPicker(modelValue = '') {
  const wrapper = mount(VDatePicker, {
    props: {
      modelValue,
      label: 'Date',
      'onUpdate:modelValue': (value: string): void => {
        void wrapper.setProps({ modelValue: value })
      },
    },
    attachTo: document.body,
  })
  return wrapper
}

// The calendar is portalled to <body>.
const cell = (day: string) =>
  [...document.body.querySelectorAll<HTMLElement>('[data-reka-calendar-cell-trigger]')].find(
    (el) => el.textContent?.trim() === day && !el.hasAttribute('data-outside-view'),
  )

// Reka's dismiss and focus handlers run on timers and after the next render.
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

describe('VDatePicker', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the date the way Figma writes it, under its label', () => {
    const wrapper = mountPicker('2024-09-18')
    const trigger = wrapper.get('button')
    expect(trigger.text()).toBe('Sep 18, 2024')
    expect(wrapper.get('label').attributes('for')).toBe(trigger.attributes('id'))
    wrapper.unmount()
  })

  it('shows the placeholder when empty or unreadable', () => {
    expect(mountPicker('').get('button').text()).toBe('Select date')
    expect(mountPicker('18.09.2024').get('button').text()).toBe('Select date')
  })

  it('opens on the chosen month and picks a day as an ISO date', async () => {
    const wrapper = mountPicker('2024-09-18')
    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(document.body.textContent).toContain('September 2024')
    expect(cell('18')?.hasAttribute('data-selected')).toBe(true)

    cell('25')?.click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([['2024-09-25']])
    expect(wrapper.get('button').text()).toBe('Sep 25, 2024')
    wrapper.unmount()
  })

  it('puts focus back on the field after Escape or a pick', async () => {
    const wrapper = mountPicker('2024-09-18')
    const trigger = wrapper.get('button')

    await trigger.trigger('click')
    await flush()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flush()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)

    await trigger.trigger('click')
    await flush()
    cell('20')?.click()
    await flush()
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('leaves focus where the user clicked outside', async () => {
    const other = document.createElement('input')
    document.body.append(other)
    const wrapper = mountPicker('2024-09-18')
    const trigger = wrapper.get('button')

    await trigger.trigger('click')
    await flush()
    other.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    other.focus()
    await flush()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(other)
    wrapper.unmount()
  })
})
