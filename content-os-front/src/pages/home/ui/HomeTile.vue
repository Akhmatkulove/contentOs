<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// A tile of Recent shoots and Products: the photo with its badge, the name, a
// line under it and the progress, if there is any. The title link stretches over
// the tile (::after); a button in #badge sits above that layer, so no button is
// nested in a link. On mobile the tile is a card of its own.
const { title, subtitle, photoUrl, to, progress } = defineProps<{
  title: string
  subtitle: string
  photoUrl: string | null
  to: RouteLocationRaw
  progress?: { done: number; total: number; percent: number }
}>()
</script>

<template>
  <article
    class="relative flex w-[calc((100%-0.75rem)/2.15)] shrink-0 snap-start flex-col gap-2.5 overflow-hidden rounded-[10px] bg-card pb-3 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-violet-300 md:w-auto md:shrink md:overflow-visible md:bg-transparent md:pb-0"
  >
    <div class="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-muted">
      <img
        v-if="photoUrl"
        :src="photoUrl"
        alt=""
        loading="lazy"
        class="size-full object-cover object-top"
      />
      <slot name="badge" />
    </div>

    <div class="flex flex-col gap-2.5 px-3 md:px-0">
      <div class="flex min-w-0 flex-col gap-1">
        <h3 class="truncate text-p2 font-semibold text-primary">
          <RouterLink :to="to" class="outline-none after:absolute after:inset-0">
            {{ title }}
          </RouterLink>
        </h3>
        <p class="truncate text-p3 font-medium text-secondary">{{ subtitle || ' ' }}</p>
      </div>

      <div v-if="progress" class="flex items-center gap-2">
        <div
          role="progressbar"
          :aria-valuenow="progress.percent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Deliverables approved"
          class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-300"
        >
          <div
            class="h-full rounded-full bg-action-accent"
            :style="{ width: `${progress.percent}%` }"
          />
        </div>
        <span class="shrink-0 text-p3 font-medium text-secondary">
          {{ progress.done }} / {{ progress.total }}
        </span>
      </div>
    </div>
  </article>
</template>
