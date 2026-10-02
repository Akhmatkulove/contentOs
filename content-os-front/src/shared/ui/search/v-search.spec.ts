import { mount } from '@vue/test-utils'
import VSearch from './v-search.vue'

function mountSearch(modelValue = '') {
  const wrapper = mount(VSearch, {
    props: {
      modelValue,
      'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
    },
  })
  return wrapper
}

describe('VSearch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('updates the model only after the debounce', async () => {
    const wrapper = mountSearch()
    await wrapper.find('input').setValue('sh')
    await vi.advanceTimersByTimeAsync(100)
    await wrapper.find('input').setValue('shoes')
    await vi.advanceTimersByTimeAsync(299)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([['shoes']])
  })

  it('trims the query and skips updates that change only whitespace', async () => {
    const wrapper = mountSearch('shoes')
    await wrapper.find('input').setValue('  shoes ')
    await vi.runAllTimersAsync()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('commits on Enter without waiting', async () => {
    const wrapper = mountSearch()
    const input = wrapper.find('input')
    await input.setValue('bag')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['bag']])
  })

  it('commits a cleared field right away', async () => {
    const wrapper = mountSearch('bag')
    await wrapper.find('input').setValue('')
    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
  })

  it('shows a value set from outside', async () => {
    const wrapper = mountSearch('bag')
    await wrapper.setProps({ modelValue: '' })
    expect(wrapper.find('input').element.value).toBe('')
  })

  it('passes attributes to the input and class to the root', () => {
    const wrapper = mount(VSearch, {
      props: { class: 'mt-4' },
      attrs: { placeholder: 'Search products…', disabled: true },
    })
    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Search products…')
    expect(input.element.disabled).toBe(true)
    expect(wrapper.classes()).toContain('mt-4')
  })
})
