import { mount } from '@vue/test-utils'
import type { Reference } from '../model/reference'
import ReferenceCard from './ReferenceCard.vue'

const reference: Reference = {
  id: '1',
  title: 'Linen texture details',
  kind: 'image',
  author: 'Studio',
  previewUrl: null,
  durationSec: null,
  fileCount: null,
  tags: [],
  favorite: false,
}

describe('ReferenceCard', () => {
  it('shows the favourite button by default', () => {
    const wrapper = mount(ReferenceCard, { props: { reference } })
    expect(wrapper.find('[aria-label="Add Linen texture details to favorites"]').exists()).toBe(
      true,
    )
  })

  it('shows how many files the reference holds, and the tags', () => {
    const wrapper = mount(ReferenceCard, {
      props: { reference: { ...reference, fileCount: 3, tags: ['Fabric', 'Texture'] } },
    })
    expect(wrapper.get('[aria-label="3 files"]').text()).toBe('3')
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Fabric', 'Texture'])
  })

  it('marks a video with a video icon', () => {
    const wrapper = mount(ReferenceCard, {
      props: { reference: { ...reference, kind: 'video', fileCount: 2 } },
    })
    const badge = wrapper.get('[aria-label="Video, 2 files"]')
    expect(badge.text()).toBe('2')
    expect(badge.get('use').attributes('href')).toMatch(/#video-01$/)
  })

  it('marks a video link with just the icon', () => {
    const wrapper = mount(ReferenceCard, { props: { reference: { ...reference, kind: 'video' } } })
    expect(wrapper.get('[aria-label="Video"]').text()).toBe('')
  })

  it('has no file count for a link', () => {
    const wrapper = mount(ReferenceCard, { props: { reference } })
    expect(wrapper.find('[aria-label$="file"], [aria-label$="files"]').exists()).toBe(false)
  })

  it('puts a screen action in its place', () => {
    const wrapper = mount(ReferenceCard, {
      props: { reference },
      slots: { action: '<button aria-label="Remove">x</button>' },
    })
    expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label$="to favorites"]').exists()).toBe(false)
  })
})
