import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { http } from '@/shared/api'
import LocationField from './LocationField.vue'

const suggestion = {
  title: 'улица Фурката, 6',
  subtitle: 'Ташкент',
  address: 'Узбекистан, Ташкент, улица Фурката, 6',
}

function mountField(modelValue = '') {
  const wrapper = mount(LocationField, {
    props: {
      label: 'Location',
      modelValue,
      'onUpdate:modelValue': (value: string): void => {
        void wrapper.setProps({ modelValue: value })
      },
    },
    global: { plugins: [createPinia(), PiniaColada] },
    attachTo: document.body,
  })
  return wrapper
}

// The list is portalled to <body>.
const filter = () =>
  document.body.querySelector<HTMLInputElement>('input[aria-label="Search address"]')
const status = () => document.body.querySelector('[role="status"]')?.textContent?.trim()

async function type(text: string) {
  const input = filter()!
  input.value = text
  input.dispatchEvent(new Event('input'))
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

describe('LocationField', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('shows the picked address under its label', () => {
    const wrapper = mountField(suggestion.address)
    const button = wrapper.get('button')
    expect(button.text()).toBe(suggestion.address)
    expect(wrapper.get('label').attributes('for')).toBe(button.attributes('id'))
  })

  it('searches Yandex suggestions and picks one as the address', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({ data: [suggestion] })
    const wrapper = mountField()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(status()).toBe('Type at least two letters')

    await type('Фурк')

    expect(get).toHaveBeenCalledWith('/locations/suggest', { params: { q: 'Фурк' } })
    const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')]
    // Title over subtitle, as Yandex shows them.
    expect(
      option.map((el) => [...el.querySelectorAll('span span')].map((s) => s.textContent?.trim())),
    ).toEqual([['улица Фурката, 6', 'Ташкент']])

    option[0]!.click()
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toEqual([[suggestion.address]])
    expect(wrapper.get('button').text()).toBe(suggestion.address)
  })

  it('does not ask the backend for a single letter', async () => {
    const get = vi.spyOn(http, 'get')
    const wrapper = mountField()
    await wrapper.get('button').trigger('click')
    await flushPromises()

    await type('Ф')

    expect(get).not.toHaveBeenCalled()
    expect(status()).toBe('Type at least two letters')
  })

  it('says so when nothing is found or the search fails', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: [] })
    const wrapper = mountField()
    await wrapper.get('button').trigger('click')
    await flushPromises()

    await type('Алматы')
    expect(status()).toBe('No addresses found in Uzbekistan')

    get.mockRejectedValueOnce(new Error('502'))
    await type('Ташкент')
    expect(status()).toBe('Address search is unavailable. Try again later.')
  })
})
