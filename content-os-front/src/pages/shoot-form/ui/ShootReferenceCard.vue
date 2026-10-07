<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VCheckbox } from '@/shared/ui/checkbox'
import { VIcon } from '@/shared/ui/icon'
import { referenceSources, type ShootReference } from '../model/shoot-draft'
import MediaPreview from './MediaPreview.vue'

// Figma "Reference / …" in "Card / References for this shoot": a 9:16 preview
// with the checkbox, "…" and, for videos, play and the length; then the title,
// where it's from and which product it's for.
const { reference } = defineProps<{ reference: ShootReference }>()

const selected = defineModel<boolean>('selected', { required: true })

const source = computed(() => referenceSources[reference.source])
const duration = computed(() =>
  reference.durationSec === null ? null : formatDuration(reference.durationSec),
)
</script>

<template>
  <article class="flex min-w-0 flex-col gap-2.5 rounded-xl border border-default p-3">
    <MediaPreview
      :src="reference.previewUrl"
      :placeholder-icon="!duration"
      class="aspect-[9/16] rounded-lg"
    >
      <VCheckbox
        :model-value="selected"
        :aria-label="`Select ${reference.title}`"
        class="absolute top-2.5 left-2.5"
        @update:model-value="selected = $event === true"
      />
      <!-- TODO(ui): the reference's actions menu (Figma "CMS / Shared / Icon button / More", Filled). -->
      <VButton
        variant="surface"
        size="icon-32"
        :aria-label="`More actions for ${reference.title}`"
        class="absolute top-2.5 right-2.5 size-7"
      >
        <VIcon name="more-horizontal" :size="16" />
      </VButton>
      <template v-if="duration">
        <!-- Figma "CMS / Shared / Play button": decoration until the preview plays. -->
        <span
          aria-hidden="true"
          class="absolute top-1/2 left-1/2 flex size-8 -translate-1/2 items-center justify-center rounded-2xl bg-overlay-scrim text-inverse"
        >
          <VIcon name="play" :size="18" />
        </span>
        <span
          class="absolute right-2.5 bottom-2.5 rounded-md bg-overlay-media px-2 py-1 text-p4 font-medium text-inverse"
        >
          <span class="sr-only">Duration </span>{{ duration }}
        </span>
      </template>
    </MediaPreview>

    <h3 class="truncate text-p1 font-semibold text-primary">{{ reference.title }}</h3>
    <dl class="flex flex-col gap-2.5 text-p3 font-medium text-secondary">
      <div class="flex items-center gap-1.5">
        <dt class="shrink-0">
          <VIcon :name="source.icon" :size="16" />
          <span class="sr-only">Source</span>
        </dt>
        <dd class="truncate">{{ source.label }}</dd>
      </div>
      <div class="flex items-center gap-1.5">
        <dt class="shrink-0">
          <VIcon name="link-01" :size="16" />
          <span class="sr-only">Product</span>
        </dt>
        <dd class="truncate">{{ reference.productName }}</dd>
      </div>
    </dl>
  </article>
</template>
