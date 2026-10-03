import { mount } from '@vue/test-utils'
import VSegmented from './v-segmented.vue'
import type { SegmentedOption } from './segmented-option'

type Source = 'upload' | 'link' | 'board'

const options: SegmentedOption<Source>[] = [
  { value: 'upload', label: 'Upload files', icon: 'upload-square-02' },
  { value: 'link', label: 'Paste link', icon: 'copy-link' },
  { value: 'board', label: 'Moodboard', disabled: true },
]

function mountSegmented() {
  const wrapper = mount(VSegmented<Source>, {
    attachTo: document.body,
    attrs: { 'aria-label': 'Reference source' },
    props: {
      options,
      modelValue: 'upload',
      'onUpdate:modelValue': (value: Source): void => {
        void wrapper.setProps({ modelValue: value })
      },
    },
  })
  return wrapper
}

const radios = () => [...document.querySelectorAll('[role="radio"]')] as HTMLButtonElement[]
const checked = () => radios().map((radio) => radio.getAttribute('aria-checked'))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('VSegmented', () => {
  it('is a labelled radio group with the picked option checked', () => {
    mountSegmented()
    const group = document.querySelector('[role="radiogroup"]')!
    expect(group.getAttribute('aria-label')).toBe('Reference source')
    expect(radios().map((radio) => radio.textContent?.trim())).toEqual([
      'Upload files',
      'Paste link',
      'Moodboard',
    ])
    expect(checked()).toEqual(['true', 'false', 'false'])
  })

  it('picks an option on click and keeps it on a second click', async () => {
    const wrapper = mountSegmented()
    radios()[1]!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([['link']])
    radios()[1]!.click()
    await wrapper.vm.$nextTick()
    expect(checked()).toEqual(['false', 'true', 'false'])
  })

  it('skips disabled options', async () => {
    const wrapper = mountSegmented()
    radios()[2]!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(radios()[2]!.disabled).toBe(true)
  })
})
