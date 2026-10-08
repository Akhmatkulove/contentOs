<script setup lang="ts">
import { computed } from 'vue'
import { VIcon, type IconName } from '@/shared/ui/icon'
import { VSelect } from '@/shared/ui/select'
import { dateFilterOptions } from '../model/shoot-filters'
import { useShootOverview } from '../model/shoots-list'

// Figma "Card / Shoot overview": shoots in the picked period, per status.
const { period, counts } = useShootOverview()

const metrics = computed<{ label: string; value: number; icon: IconName }[]>(() => [
  { label: 'Total shoots', value: counts.value?.all ?? 0, icon: 'calendar-02' },
  { label: 'In progress', value: counts.value?.in_progress ?? 0, icon: 'play' },
  { label: 'Upcoming', value: counts.value?.upcoming ?? 0, icon: 'camera-01' },
  { label: 'Completed', value: counts.value?.completed ?? 0, icon: 'checkmark-circle-01' },
])
</script>

<template>
  <section
    aria-labelledby="shoot-overview"
    class="flex flex-col gap-4 rounded-2xl bg-card px-4 py-5 shadow-[0_8px_16px_rgb(29_42_60/0.05)] md:p-5 md:shadow-none"
  >
    <h2 id="shoot-overview" class="text-h6 text-primary">Shoot overview</h2>
    <VSelect v-model="period" :options="dateFilterOptions" aria-label="Period" />
    <dl class="flex flex-col gap-4">
      <div v-for="metric in metrics" :key="metric.label" class="flex items-center gap-3">
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-status-accent text-link"
        >
          <VIcon :name="metric.icon" :size="18" />
        </span>
        <div class="flex flex-col-reverse gap-1">
          <dt class="text-p3 font-medium text-secondary">{{ metric.label }}</dt>
          <dd class="text-h6 text-primary">{{ metric.value }}</dd>
        </div>
      </div>
    </dl>
  </section>
</template>
