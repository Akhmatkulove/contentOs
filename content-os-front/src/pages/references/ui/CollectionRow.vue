<script setup lang="ts">
import { useResizeObserver, useScroll } from '@vueuse/core'
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { ReferenceCard, type Reference } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

const { name, total, references, canRemove } = defineProps<{
  name: string
  // How many of the collection's references match; `references` are the first of them.
  total: number
  references: Reference[]
  canRemove: (id: string) => boolean
}>()

const emit = defineEmits<{ open: []; toggleFavorite: [Reference]; remove: [Reference] }>()

const headingId = useId()
const track = useTemplateRef('track')
const { arrivedState, measure } = useScroll(track)
// Desktop: a card as wide as a column of the page's grid
// (repeat(auto-fill, minmax(200px, 1fr)) with a 20px gap), so it keeps its
// width when the collection opens. Mobile has its own width in the template.
const MIN_CARD = 200
const GAP = 20
const cardWidth = shallowRef<number>()
// The ends move when the width or the cards change, not only on scroll.
useResizeObserver(track, ([entry]) => {
  measure()
  const width = entry!.contentRect.width
  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_CARD + GAP)))
  cardWidth.value = (width - (columns - 1) * GAP) / columns
})
const overflows = computed(() => !(arrivedState.left && arrivedState.right))
const more = computed(() => total - references.length)

// About a screen of cards per click; snapping lines up the first one.
// Smoothness comes from CSS, which reduced motion turns off.
function scroll(direction: 1 | -1) {
  const strip = track.value
  if (strip) strip.scrollBy({ left: direction * strip.clientWidth * 0.8 })
}
</script>

<!--
  One collection on the Collections tab: its name, how many references match, and
  a sideways row of the first of them. The row bleeds to the screen edges on
  mobile and gets arrows on desktop; "View all" opens the whole collection.
-->
<template>
  <!-- Same header height and gap to the cards as an opened collection on the
       page, so opening and closing one doesn't shift the cards. -->
  <section :aria-labelledby="headingId" class="flex flex-col gap-4 md:gap-5">
    <header class="flex min-h-9 items-center gap-3">
      <h2 :id="headingId" class="flex min-w-0 items-baseline gap-2">
        <span class="truncate text-h6 text-primary">{{ name }}</span>
        <span class="shrink-0 text-p2 font-medium text-tertiary">
          {{ total }}<span class="sr-only"> {{ total === 1 ? 'reference' : 'references' }}</span>
        </span>
      </h2>
      <div class="ml-auto flex shrink-0 items-center gap-2">
        <div v-if="overflows" class="hidden items-center gap-1.5 md:flex">
          <VButton
            variant="secondary"
            size="icon-32"
            aria-label="Scroll back"
            :disabled="arrivedState.left"
            @click="scroll(-1)"
          >
            <VIcon name="arrow-left-01-sharp" :size="16" />
          </VButton>
          <VButton
            variant="secondary"
            size="icon-32"
            aria-label="Scroll forward"
            :disabled="arrivedState.right"
            @click="scroll(1)"
          >
            <VIcon name="arrow-right-01-sharp" :size="16" />
          </VButton>
        </div>
        <VButton variant="soft" size="34" @click="emit('open')">
          View all<span class="sr-only"> in {{ name }}</span>
          <VIcon name="arrow-right-01-sharp" />
        </VButton>
      </div>
    </header>

    <!-- Mobile: two cards and a peek of the third, so the row reads as scrollable. -->
    <ul
      ref="track"
      :style="cardWidth ? { '--card-width': `${cardWidth}px` } : undefined"
      :class="[
        'scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 motion-reduce:scroll-auto md:mx-0 md:scroll-px-0 md:gap-5 md:px-0',
        !arrivedState.right && 'md:mask-r-from-[calc(100%-4rem)]',
      ]"
    >
      <li
        v-for="reference in references"
        :key="reference.id"
        class="w-[calc((100%-0.75rem)/2.25)] shrink-0 snap-start md:w-(--card-width,200px)"
      >
        <ReferenceCard
          :reference="reference"
          :removable="canRemove(reference.id)"
          @toggle-favorite="emit('toggleFavorite', reference)"
          @remove="emit('remove', reference)"
        />
      </li>
      <!-- The rest of the collection: a tile as tall as the cards. -->
      <li
        v-if="more > 0"
        class="w-[calc((100%-0.75rem)/2.25)] shrink-0 snap-start md:w-(--card-width,200px)"
      >
        <VButton
          variant="secondary"
          class="size-full flex-col gap-2 rounded-xl border-dashed md:rounded-2xl"
          @click="emit('open')"
        >
          <span class="text-h5">+{{ more }}</span>
          <span class="text-p3 font-medium">
            more<span class="sr-only"> in {{ name }}</span>
          </span>
        </VButton>
      </li>
    </ul>
  </section>
</template>
