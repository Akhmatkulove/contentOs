import { mount } from '@vue/test-utils'
import type { DeliverableDraft } from '../model/deliverable-draft'
import DeliverablesList from './DeliverablesList.vue'

const deliverables: DeliverableDraft[] = [
  {
    id: '1',
    name: 'Walking transition',
    type: 'video',
    assignee: { id: 'a', name: 'Amina', photo_url: '/amina.webp' },
    status: 'to_shoot',
    shoots: 0,
    dueDate: '2024-09-18',
    brief: 'Product movement video',
  },
  {
    id: '2',
    name: 'Fabric close-up',
    type: 'video',
    assignee: { id: 'b', name: 'Odina', photo_url: null },
    status: 'approved',
    shoots: 1,
    dueDate: '',
    brief: '',
  },
  {
    id: '3',
    name: 'Detail',
    type: 'video',
    assignee: { id: 'c', name: null, photo_url: null },
    status: 'needs_changes',
    shoots: 1,
    dueDate: '',
    brief: '',
  },
]

const rows = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAll('[role="row"]')
    .slice(1)
    .map((row) => row.findAll('[role="cell"]').map((cell) => cell.text()))

describe('DeliverablesList', () => {
  it('has no Reference column', () => {
    const wrapper = mount(DeliverablesList, { props: { deliverables } })
    expect(wrapper.findAll('[role="columnheader"]').map((th) => th.text())).toEqual([
      'Deliverable',
      'Type',
      'Assigned to',
      'Status',
      'Due date',
      'Actions',
    ])
  })

  it('shows a row per deliverable', () => {
    const wrapper = mount(DeliverablesList, { props: { deliverables } })
    expect(rows(wrapper)).toEqual([
      [
        'Walking transitionProduct movement video',
        'Video',
        'Amina',
        'Not scheduled',
        'Sep 18, 2024',
        '',
      ],
      ['Fabric close-up', 'Video', 'OOdina', 'Approved', '—', ''],
      ['Detail', 'Video', 'UUnnamed', 'Needs changes', '—', ''],
    ])
    expect(wrapper.find('img').attributes('src')).toBe('/amina.webp')
  })

  it('shows a card per deliverable on mobile, without checkbox and references', () => {
    const wrapper = mount(DeliverablesList, { props: { deliverables } })
    const cards = wrapper.findAll('li')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.text()).toBe(
      'Walking transitionProduct movement videoNot scheduledVideoAssigneeAminaDue date Sep 18, 2024',
    )
    expect(wrapper.find('li input[type="checkbox"]').exists()).toBe(false)
    expect(cards[0]!.find('[aria-label="Remove Walking transition"]').exists()).toBe(true)
  })

  it('asks to remove a deliverable', async () => {
    const wrapper = mount(DeliverablesList, { props: { deliverables } })
    await wrapper.get('[aria-label="Remove Walking transition"]').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['1']])
  })

  it('keeps a deliverable a shoot already works on', () => {
    const wrapper = mount(DeliverablesList, { props: { deliverables } })
    const cross = wrapper.get(
      '[aria-label="Fabric close-up is in work in a shoot and can\'t be removed"]',
    )
    expect(cross.attributes('disabled')).toBeDefined()
  })
})
