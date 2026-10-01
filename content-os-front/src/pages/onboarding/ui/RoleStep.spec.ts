import { mount } from '@vue/test-utils'
import RoleStep from './RoleStep.vue'

describe('RoleStep', () => {
  it('enables Continue only after a role is picked', async () => {
    const wrapper = mount(RoleStep)
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('input[value="manager"]').setValue()

    expect(submit.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('input[value="manager"]').element).toHaveProperty('checked', true)
  })

  it('marks the first step as current', () => {
    const wrapper = mount(RoleStep)
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Your role')
  })
})
