<script setup lang="ts">
import { computed } from 'vue'
import { deliverablesLabel, type DeliverableStatus } from '@/entities/deliverable'
import type { DeliveryProgress } from '../model/product'

// Figma "Card / Progress": approved out of all deliverables, then a count per status.
const { progress } = defineProps<{ progress: DeliveryProgress }>()

// Figma's short labels and the colours of the count chips.
const summary: { status: DeliverableStatus; label: string; chip: string }[] = [
  { status: 'approved', label: 'Approved', chip: 'bg-mint-100 text-mint-400' },
  { status: 'needs_changes', label: 'Changes', chip: 'bg-red-100 text-red-400' },
  { status: 'in_progress', label: 'In progress', chip: 'bg-status-info text-status-info' },
  { status: 'to_shoot', label: 'To shoot', chip: 'bg-neutral-300 text-secondary' },
]

const done = computed(() => `${progress.done} / ${deliverablesLabel(progress.total)}`)
</script>

<template>
  <section class="flex flex-col gap-3 rounded-2xl bg-card p-4" aria-labelledby="product-progress">
    <h2 id="product-progress" class="text-p1 font-semibold text-primary">Progress</h2>
    <div class="flex items-center justify-between text-p3 font-medium text-primary">
      <span>{{ done }}</span>
      <span>{{ progress.percent }}%</span>
    </div>
    <div
      role="progressbar"
      :aria-valuenow="progress.percent"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Deliverables approved"
      class="h-[5px] overflow-hidden rounded-full bg-neutral-300"
    >
      <div
        class="h-full rounded-full bg-action-accent transition-[width] duration-300"
        :style="{ width: `${progress.percent}%` }"
      />
    </div>
    <dl class="flex h-16 rounded-lg border border-default bg-muted md:bg-subtle">
      <div
        v-for="item in summary"
        :key="item.status"
        class="flex flex-1 flex-col-reverse items-center justify-center gap-1.5 border-r border-default last:border-r-0"
      >
        <dt class="text-p4 font-medium whitespace-nowrap text-secondary">{{ item.label }}</dt>
        <dd
          :class="[
            'flex size-5 items-center justify-center rounded-[10px] text-p4 font-medium',
            item.chip,
          ]"
        >
          {{ progress.counts[item.status] }}
        </dd>
      </div>
    </dl>
  </section>
</template>
