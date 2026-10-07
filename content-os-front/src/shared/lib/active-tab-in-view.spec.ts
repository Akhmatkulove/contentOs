import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, useTemplateRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useActiveTabInView } from './active-tab-in-view'

async function setup(initial: string) {
  const active = ref(initial)
  const wrapper = mount(
    defineComponent(() => {
      useActiveTabInView(useTemplateRef('strip'), active)
      return () =>
        h(
          'div',
          { ref: 'strip' },
          ['a', 'b', 'c'].map((value, index) =>
            h('button', {
              role: 'tab',
              'data-index': index,
              'data-state': value === active.value ? 'active' : 'inactive',
            }),
          ),
        )
    }),
  )
  // The template ref lands after the first render.
  await nextTick()
  return { wrapper, active }
}

describe('useActiveTabInView', () => {
  const scrollTo = vi.fn()

  // jsdom has no layout: three 100px tabs in a 150px strip.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(150)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return Number(this.dataset.index) * 100
    })
    HTMLElement.prototype.scrollTo = scrollTo
  })
  afterEach(() => {
    vi.restoreAllMocks()
    scrollTo.mockReset()
  })

  it('jumps to a hidden tab from the URL without animation', async () => {
    await setup('c')
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 150, behavior: 'instant' })
  })

  it('leaves a visible tab alone and slides to a switched one', async () => {
    const { active } = await setup('a')
    expect(scrollTo).not.toHaveBeenCalled()

    active.value = 'b'
    await nextTick()
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 50, behavior: 'smooth' })
  })
})
