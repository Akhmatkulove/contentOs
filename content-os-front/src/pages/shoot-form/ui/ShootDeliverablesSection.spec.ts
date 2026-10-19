import { mount } from '@vue/test-utils'
import type { ShootDeliverable } from '../model/shoot-draft'
import ShootDeliverablesSection from './ShootDeliverablesSection.vue'

const walk: ShootDeliverable = {
  id: 'd1',
  name: 'Walking transition',
  type: 'video',
  product: { id: 'p1', name: 'Black Abaya 042', collection: '', photoUrl: null, archived: false },
  productDeliverable: null,
  references: [],
  assignees: [],
  dueDate: '',
  status: 'to_shoot',
}

describe('ShootDeliverablesSection', () => {
  it('asks to remove a deliverable by its ×, in the table and on mobile', async () => {
    const wrapper = mount(ShootDeliverablesSection, {
      props: { deliverables: [walk] },
    })
    const buttons = wrapper.findAll('button[aria-label="Remove Walking transition"]')
    expect(buttons).toHaveLength(2)
    for (const button of buttons) await button.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['d1'], ['d1']])
  })
})
