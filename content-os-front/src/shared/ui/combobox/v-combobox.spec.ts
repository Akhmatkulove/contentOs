import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import VCombobox from './v-combobox.vue'

let mounted: VueWrapper | undefined

function mountCombobox(start = '') {
  const value = ref(start)
  const wrapper = mount(VCombobox, {
    attachTo: document.body,
    props: {
      options: ['Autumn 26', 'Résort 25', 'Summer 26'],
      label: 'Collection',
      modelValue: value.value,
      'onUpdate:modelValue': (next: string) => {
        value.value = next
        wrapper.setProps({ modelValue: next })
      },
    },
  })
  mounted = wrapper
  return { wrapper, value }
}

const options = () =>
  [...document.querySelectorAll('[role="option"]')].map((el) => el.textContent?.trim())

async function type(wrapper: ReturnType<typeof mountCombobox>['wrapper'], text: string) {
  await wrapper.get('input').setValue(text)
  await flushPromises()
}

afterEach(() => {
  mounted?.unmount()
  mounted = undefined
  document.body.innerHTML = ''
})

describe('VCombobox', () => {
  it('takes free text', async () => {
    const { wrapper, value } = mountCombobox()
    await type(wrapper, 'Winter')
    expect(value.value).toBe('Winter')
    expect(wrapper.get('label').text()).toBe('Collection')
  })

  it('suggests matching options and offers to create a new one first', async () => {
    const { wrapper } = mountCombobox()
    // Accent-insensitive search; the exact name differs, so it can still be created.
    await type(wrapper, 'resort')
    expect(options()).toEqual(['Create “resort”', 'Résort 25'])
    await type(wrapper, 'sum')
    expect(options()).toEqual(['Create “sum”', 'Summer 26'])
  })

  it('offers no creation for an existing name in another case', async () => {
    const { wrapper } = mountCombobox()
    await type(wrapper, 'summer 26')
    expect(options()).toEqual(['Summer 26'])
  })

  it('picks a suggestion', async () => {
    const { wrapper, value } = mountCombobox()
    await type(wrapper, 'aut')
    const autumn = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (el) => el.textContent?.trim() === 'Autumn 26',
    )!
    autumn.click()
    await flushPromises()
    expect(value.value).toBe('Autumn 26')
  })
})
