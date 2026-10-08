import { mount } from '@vue/test-utils'
import type { ShootProduct } from '../model/shoot-draft'
import SelectableProductCard from './SelectableProductCard.vue'

const product: ShootProduct = {
  id: 'p1',
  name: 'Black Abaya 042',
  collection: 'Autumn 26',
  photoUrl: null,
}

function mountCard(selected: boolean, overrides: Partial<ShootProduct> = {}) {
  return mount(SelectableProductCard, {
    props: { product: { ...product, ...overrides }, selected },
    attachTo: document.body,
  })
}

describe('SelectableProductCard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the product with its checkbox', () => {
    const wrapper = mountCard(false)
    expect(wrapper.text()).toContain('Black Abaya 042')
    expect(wrapper.text()).toContain('Autumn 26')
    expect(wrapper.get('[role="checkbox"]').attributes('aria-label')).toBe('Select Black Abaya 042')
  })

  it('ticks on a click anywhere: the card is the checkbox label', async () => {
    const wrapper = mountCard(false)
    await wrapper.get('label').trigger('click')
    expect(wrapper.emitted('update:selected')).toEqual([[true]])
  })

  it('unticks a selected card', async () => {
    const wrapper = mountCard(true)
    await wrapper.get('[role="checkbox"]').trigger('click')
    expect(wrapper.emitted('update:selected')).toEqual([[false]])
  })

  it('leaves out an empty collection', () => {
    const wrapper = mountCard(false, { collection: '' })
    expect(wrapper.findAll('label > span')).toHaveLength(1)
  })
})
