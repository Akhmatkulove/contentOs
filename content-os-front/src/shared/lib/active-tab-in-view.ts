import { unrefElement, usePreferredReducedMotion, type MaybeElementRef } from '@vueuse/core'
import { toValue, watch, type MaybeRefOrGetter } from 'vue'

// Keeps the active tab of a sideways-scrolling tab strip in view: the tab from
// the URL on load, then every switch. Only the strip scrolls, never the page.
// The strip must be the offset parent of its tabs (`relative`).
export function useActiveTabInView(list: MaybeElementRef, active: MaybeRefOrGetter<unknown>) {
  const motion = usePreferredReducedMotion()
  let first = true
  watch(
    [() => unrefElement(list), () => toValue(active)],
    ([strip]) => {
      if (!(strip instanceof HTMLElement)) return
      // The tab from the URL appears at once; a switch slides to its tab.
      const smooth = !first && motion.value !== 'reduce'
      first = false
      const tab = strip.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (!tab) return
      const start = tab.offsetLeft
      const end = start + tab.offsetWidth
      let left: number | undefined
      if (start < strip.scrollLeft) left = start
      else if (end > strip.scrollLeft + strip.clientWidth) left = end - strip.clientWidth
      if (left !== undefined) strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' })
    },
    { flush: 'post', immediate: true },
  )
}
