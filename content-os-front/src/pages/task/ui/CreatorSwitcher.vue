<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { VAvatar } from '@/shared/ui/avatar'
import { VStatus } from '@/shared/ui/status'
import { creatorStatus, type CreatorWork } from '../model/review'

// Whose work is under review when a deliverable has several assignees. Figma
// shows one creator; with more, each gets a tab with their status so the art
// director sees at a glance who is waiting. Arrows move between them.
const { creators, selected, progress } = defineProps<{
  creators: CreatorWork[]
  selected: string
  // "1 of 2 approved".
  progress: string
}>()
defineEmits<{ select: [id: string] }>()
</script>

<template>
  <section aria-labelledby="review-creators" class="flex flex-col gap-3">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="review-creators" class="text-h6 text-brand">Creators</h2>
      <p class="text-p3 font-medium text-secondary">{{ progress }}</p>
    </div>
    <RadioGroupRoot
      :model-value="selected"
      orientation="horizontal"
      aria-labelledby="review-creators"
      class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      @update:model-value="(value) => $emit('select', value as string)"
    >
      <RadioGroupItem
        v-for="creator in creators"
        :key="creator.id"
        :value="creator.id"
        class="flex shrink-0 items-center gap-2.5 rounded-2xl border border-transparent bg-card py-2 pr-3 pl-2 text-left transition-colors outline-none hover:border-default focus-visible:ring-2 focus-visible:ring-violet-300 data-[state=checked]:border-violet-400"
      >
        <VAvatar :name="creator.name" :src="creator.photoUrl" :size="36" />
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="truncate text-p2 font-semibold text-brand">{{ creator.name }}</span>
          <span v-if="creator.role" class="text-p3 font-medium text-secondary">
            {{ creator.role }}
          </span>
        </span>
        <VStatus :tone="creatorStatus(creator.status).tone" :size="24" class="ml-1">
          {{ creatorStatus(creator.status).label }}
        </VStatus>
      </RadioGroupItem>
    </RadioGroupRoot>
  </section>
</template>
