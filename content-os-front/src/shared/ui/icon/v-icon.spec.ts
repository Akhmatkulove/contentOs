import { mount } from '@vue/test-utils'
import sprite from './sprite.svg?raw'
import VIcon from './v-icon.vue'
import { iconNames } from './icon-names'

describe('VIcon', () => {
  it('lists exactly the symbols that exist in the sprite', () => {
    const ids = [...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1])
    expect([...iconNames].sort()).toEqual(ids.sort())
  })

  it('references the symbol by name', () => {
    const wrapper = mount(VIcon, { props: { name: 'search', size: 16 } })
    expect(wrapper.find('use').attributes('href')).toMatch(/#search$/)
    expect(wrapper.attributes('width')).toBe('16')
  })
})
