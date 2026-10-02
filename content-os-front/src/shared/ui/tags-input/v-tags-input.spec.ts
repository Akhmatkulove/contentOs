import { flushPromises, mount } from '@vue/test-utils'
import VTagsInput from './v-tags-input.vue'

function mountTags(props: Partial<InstanceType<typeof VTagsInput>['$props']> = {}) {
  const wrapper = mount(VTagsInput, {
    attachTo: document.body,
    props: {
      label: 'Tags',
      placeholder: 'Add tags',
      modelValue: [],
      'onUpdate:modelValue': (value?: string[]): void => {
        void wrapper.setProps({ modelValue: value })
      },
      ...props,
    },
  })
  return wrapper
}

async function type(wrapper: ReturnType<typeof mountTags>, value: string, key = 'Enter') {
  const input = wrapper.get('input')
  await input.setValue(value)
  await input.trigger('keydown', { key })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('VTagsInput', () => {
  it('links the label to the input and hides the placeholder once tags exist', async () => {
    const wrapper = mountTags()
    const input = wrapper.get('input')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('placeholder')).toBe('Add tags')

    await wrapper.setProps({ modelValue: ['silk'] })
    expect(wrapper.get('input').attributes('placeholder')).toBeUndefined()
  })

  it('adds a tag on Enter and skips duplicates', async () => {
    const wrapper = mountTags()
    await type(wrapper, 'silk')
    await type(wrapper, 'linen')
    await type(wrapper, 'silk')
    expect(wrapper.props('modelValue')).toEqual(['silk', 'linen'])
    expect(wrapper.text()).toContain('linen')
  })

  it('removes a tag with its delete button', async () => {
    const wrapper = mountTags({ modelValue: ['silk', 'linen'] })
    await wrapper.get('button[aria-label="Remove silk"]').trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['linen'])
  })

  it('shows the + button while typing and adds the tag with it', async () => {
    const wrapper = mountTags()
    const add = () => wrapper.find('button[aria-label="Add tag"]')
    expect(add().exists()).toBe(false)

    await wrapper.get('input').setValue('  silk ')
    await add().trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['silk'])
    expect(wrapper.get('input').element.value).toBe('')
    expect(add().exists()).toBe(false)
  })

  it('hides the + button once Enter adds the tag', async () => {
    const wrapper = mountTags()
    await type(wrapper, 'silk')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Add tag"]').exists()).toBe(false)
  })

  it('shows the error and marks the input invalid', () => {
    const wrapper = mountTags({ error: 'Add at least one tag.' })
    const input = wrapper.get('input')
    const message = wrapper.get('p')
    expect(message.text()).toBe('Add at least one tag.')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(message.attributes('id'))
  })
})
