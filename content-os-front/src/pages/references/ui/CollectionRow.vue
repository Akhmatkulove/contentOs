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
// The end moves when the width or the cards change, not only on scroll.
useResizeObserver(track, ([entry]) => {
  measure()
  const width = entry!.contentRect.width
  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_CARD + GAP)))
  cardWidth.value = (width - (columns - 1) * GAP) / columns
})
const more = computed(() => total - references.length)
</script>

<!--
  One collection on the Collections tab: its name, how many references match, and
  a sideways row of the first of them. When some didn't fit in the row, "View all"
  and a "+N more" tile at its end open the whole collection. The row bleeds to
  the screen edges on mobile.
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
      <VButton v-if="more > 0" variant="soft" size="34" class="ml-auto" @click="emit('open')">
        View all<span class="sr-only"> in {{ name }}</span>
        <VIcon name="arrow-right-01-sharp" />
      </VButton>
    </header>

    <!-- Mobile: two cards and a peek of the third, so the row reads as scrollable.
         relative: absolute bits of the cards (sr-only text) are clipped by the row
         instead of widening the page. -->
    <ul
      ref="track"
      :style="cardWidth ? { '--card-width': `${cardWidth}px` } : undefined"
      :class="[
        'scrollbar-none relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:scroll-px-0 md:gap-5 md:px-0',
        // More to the right: the last cards fade softly instead of being cut off.
        !arrivedState.right &&
          'md:[mask-image:linear-gradient(to_right,#000_calc(100%-10rem),rgb(0_0_0/0.9)_calc(100%-7rem),rgb(0_0_0/0.7)_calc(100%-4rem),rgb(0_0_0/0.45))]',
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
      <!-- The rest of the collection. Shaped like a card's 9:16 preview: on mobile
           the same border and padding as the card surround it. -->
      <li
        v-if="more > 0"
        class="w-[calc((100%-0.75rem)/2.25)] shrink-0 snap-start border border-transparent p-2.5 md:w-(--card-width,200px) md:border-0 md:p-0"
      >
        <VButton
          variant="secondary"
          class="aspect-[9/16] h-auto w-full flex-col gap-2 rounded-lg border-dashed md:rounded-2xl"
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
