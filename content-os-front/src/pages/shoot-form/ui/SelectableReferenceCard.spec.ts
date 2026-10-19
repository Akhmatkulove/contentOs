import { mount, RouterLinkStub } from '@vue/test-utils'
import type { Reference } from '@/entities/reference'
import SelectableReferenceCard from './SelectableReferenceCard.vue'

const reference: Reference = {
  id: 'r1',
  title: 'Linen texture',
  kind: 'image',
  author: 'Studio',
  previewUrl: null,
  durationSec: null,
  imageCount: 1,
  videoCount: 0,
  tags: ['Fabric'],
  favorite: false,
}

function mountCard(selected: boolean) {
  return mount(SelectableReferenceCard, {
    props: { reference, selected },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('SelectableReferenceCard', () => {
  it('is the reference card with a checkbox instead of the star', () => {
    const wrapper = mountCard(false)
    expect(wrapper.get('h3').text()).toBe('Linen texture')
    const box = wrapper.get('[role="checkbox"]')
    expect(box.attributes('aria-label')).toBe('Select Linen texture')
    expect(box.attributes('aria-checked')).toBe('false')
    expect(wrapper.find('[aria-label^="Favorite"]').exists()).toBe(false)
  })

  it('ticks on a click anywhere on the card', async () => {
    const wrapper = mountCard(false)
    await wrapper.get('[data-card-hit-area]').trigger('click')
    expect(wrapper.emitted('update:selected')).toEqual([[true]])
  })

  it('unticks a selected card', async () => {
    const wrapper = mountCard(true)
    await wrapper.get('[data-card-hit-area]').trigger('click')
    expect(wrapper.emitted('update:selected')).toEqual([[false]])
  })

  it('ticks from the keyboard through the checkbox', async () => {
    const wrapper = mountCard(false)
    await wrapper.get('[role="checkbox"]').trigger('click')
    expect(wrapper.emitted('update:selected')).toEqual([[true]])
  })

  it('hides the click layer from assistive tech', () => {
    expect(mountCard(false).get('[data-card-hit-area]').attributes('aria-hidden')).toBe('true')
  })

  it('previews the reference in a new tab without ticking it', () => {
    const wrapper = mountCard(false)
    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'reference', params: { id: 'r1' } })
    expect(link.attributes('target')).toBe('_blank')
    expect(link.text()).toBe('Preview')
    expect(wrapper.emitted('update:selected')).toBeUndefined()
  })
})
