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
  imageCount: 0,
  videoCount: 0,
  tags: [],
  favorite: false,
}

describe('ReferenceCard', () => {
  it('shows the favourite button by default and asks to toggle it', async () => {
    const wrapper = mount(ReferenceCard, { props: { reference } })
    const star = wrapper.get('[aria-label="Favorite Linen texture details"]')
    expect(star.attributes('aria-pressed')).toBe('false')
    await star.trigger('click')
    expect(wrapper.emitted('toggleFavorite')).toHaveLength(1)
  })

  it('fills the star of a favourite', () => {
    const wrapper = mount(ReferenceCard, { props: { reference: { ...reference, favorite: true } } })
    const star = wrapper.get('[aria-label="Favorite Linen texture details"]')
    expect(star.attributes('aria-pressed')).toBe('true')
    expect(star.classes()).toContain('[--icon-fill:currentColor]')
  })

  it('shows how many files the reference holds, and the tags', () => {
    const wrapper = mount(ReferenceCard, {
      props: { reference: { ...reference, imageCount: 3, tags: ['Fabric', 'Texture'] } },
    })
    expect(wrapper.get('[aria-label="3 images"]').text()).toBe('3')
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Fabric', 'Texture'])
  })

  it('counts videos and images in separate badges', () => {
    const wrapper = mount(ReferenceCard, {
      props: { reference: { ...reference, kind: 'video', videoCount: 1, imageCount: 2 } },
    })
    const video = wrapper.get('[aria-label="1 video"]')
    expect(video.text()).toBe('1')
    expect(video.get('use').attributes('href')).toMatch(/#video-01$/)
    const images = wrapper.get('[aria-label="2 images"]')
    expect(images.text()).toBe('2')
    expect(images.get('use').attributes('href')).toMatch(/#image-02$/)
  })

  it('marks a video link with just the icon', () => {
    const wrapper = mount(ReferenceCard, { props: { reference: { ...reference, kind: 'video' } } })
    expect(wrapper.get('[aria-label="Video"]').text()).toBe('')
  })

  it('has no file count for a link', () => {
    const wrapper = mount(ReferenceCard, { props: { reference } })
    expect(wrapper.find('[aria-label$="image"], [aria-label$="images"]').exists()).toBe(false)
  })

  it('puts a screen action in its place', () => {
    const wrapper = mount(ReferenceCard, {
      props: { reference },
      slots: { action: '<button aria-label="Remove">x</button>' },
    })
    expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label^="Favorite"]').exists()).toBe(false)
  })
})
