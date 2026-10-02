<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import type { LinkPreview } from '../model/add-reference-form'

// Figma "CMS / Shared / Link preview": what a pasted link points to.
defineProps<{ preview: LinkPreview }>()

defineEmits<{ remove: [] }>()
</script>

<template>
  <div class="flex items-center gap-3 rounded-xl border border-default bg-card p-3">
    <div class="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
      <img :src="preview.thumbnail" alt="" class="size-full object-cover" />
      <!-- Figma "CMS / Shared / Play button". -->
      <span
        v-if="preview.video"
        class="absolute top-1/2 left-1/2 flex size-8 -translate-1/2 items-center justify-center rounded-2xl bg-overlay-scrim text-inverse"
      >
        <VIcon name="play" :size="16" />
      </span>
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="truncate text-p2 font-semibold text-primary">{{ preview.title }}</p>
      <p class="flex items-center gap-1.5 text-p3 font-medium text-secondary">
        <VIcon :name="preview.sourceIcon" :size="14" />
        {{ preview.source }}
      </p>
    </div>

    <VButton variant="ghost" size="icon-32" aria-label="Remove link" @click="$emit('remove')">
      <span
        class="flex size-[22px] items-center justify-center rounded-full bg-overlay-media text-inverse"
      >
        <VIcon name="multiplication-sign" :size="12" />
      </span>
    </VButton>
  </div>
</template>
