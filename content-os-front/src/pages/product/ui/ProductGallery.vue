<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { Schemas } from '@/shared/api'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "CMS / Products / Gallery": the selected photo large, all photos below.
// "Add" opens the edit form at Photos; only the owner gets it.
const {
  photos,
  name,
  addTo = null,
} = defineProps<{
  photos: Schemas['FileResponse'][]
  name: string
  addTo?: RouteLocationRaw | null
}>()

const selected = ref(0)
// Fewer photos after an edit: fall back to the first.
watch(
  () => photos.length,
  (count) => {
    if (selected.value >= count) selected.value = 0
  },
)
const hero = computed(() => photos[selected.value] ?? null)
</script>

<template>
  <section
    aria-label="Photos"
    class="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_8px_16px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
  >
    <div class="aspect-[3/4] overflow-hidden rounded-lg bg-muted md:aspect-[2/3]">
      <img v-if="hero" :src="hero.url" :alt="name" class="size-full object-cover" />
    </div>

    <!-- Mobile: one scrollable row; desktop: wraps inside the narrow card. -->
    <ul class="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
      <li v-for="(photo, index) in photos" :key="photo.id">
        <VButton
          variant="ghost"
          :aria-label="`Photo ${index + 1} of ${photos.length}`"
          :aria-pressed="index === selected"
          class="relative h-[69px] w-[45px] overflow-hidden rounded-lg p-0 after:absolute after:inset-0 after:rounded-lg aria-pressed:bg-transparent aria-pressed:after:border-2 aria-pressed:after:border-violet-400 md:h-[66px] md:w-[53px]"
          @click="selected = index"
        >
          <img :src="photo.url" alt="" loading="lazy" class="size-full object-cover" />
        </VButton>
      </li>
      <li v-if="addTo">
        <VButton
          as-child
          variant="ghost"
          class="h-[69px] w-[45px] flex-col gap-0 rounded-lg border border-dashed border-pink-200 bg-card text-p3 font-medium text-primary md:h-[66px] md:w-[53px] md:border-0 md:bg-status-accent md:text-link"
        >
          <RouterLink :to="addTo" aria-label="Add photos">
            <VIcon name="plus-sign" :size="20" />
            Add
          </RouterLink>
        </VButton>
      </li>
    </ul>
  </section>
</template>
