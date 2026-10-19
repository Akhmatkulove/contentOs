import { mount } from '@vue/test-utils'
import { h } from 'vue'
import type { ContentVersion } from '../model/task'
import ContentVersionCard from './ContentVersionCard.vue'

const version: ContentVersion = {
  id: 'v1',
  label: 'V1',
  author: null,
  uploaded: 'Uploaded Sep 18, 14:22',
  files: [{ id: 'f1', name: 'a.jpg', size: '1 KB', url: 'f1', video: false }],
  status: { label: 'Needs changes', tone: 'danger' },
  feedback: 'Closer',
  needsChanges: true,
}

function card(props: { editable?: boolean; editing?: boolean }) {
  return mount(ContentVersionCard, {
    props: { version, defaultOpen: true, ...props },
    // As on the task page: the slot is always passed, its content only while editing.
    slots: { default: () => (props.editing ? h('p', 'Editor') : null) },
  })
}

describe('ContentVersionCard', () => {
  it('shows the files and the way to fix them', async () => {
    const wrapper = card({ editable: true })
    expect(wrapper.find('img[alt="a.jpg"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Editor')
    const button = wrapper.findAll('button').find((item) => item.text() === 'Edit files')!
    await button.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('has no Edit files button unless editable', () => {
    expect(card({}).text()).not.toContain('Edit files')
  })

  it('puts the editor in the files’ place while editing', () => {
    const wrapper = card({ editable: false, editing: true })
    expect(wrapper.text()).toContain('Editor')
    expect(wrapper.find('img[alt="a.jpg"]').exists()).toBe(false)
  })
})
