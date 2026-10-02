import { mount } from '@vue/test-utils'
import VStatus from './v-status.vue'

describe('VStatus', () => {
  it('shows the label from the slot', () => {
    const wrapper = mount(VStatus, { props: { tone: 'success' }, slots: { default: 'Approved' } })
    expect(wrapper.text()).toBe('Approved')
  })

  it('switches colours with the tone', () => {
    const wrapper = mount(VStatus, { props: { tone: 'danger' } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['bg-red-100', 'text-red-400']))
  })

  it('uses the small type for the compact sizes', () => {
    expect(mount(VStatus, { props: { size: 26 } }).classes()).toContain('text-p3')
    expect(mount(VStatus, { props: { size: 20 } }).classes()).toContain('text-p4')
  })
})
