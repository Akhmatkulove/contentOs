<script setup lang="ts">
import { computed } from 'vue'
import type { DeliverableStatus } from '@/entities/deliverable'
import { VIcon, type IconName } from '@/shared/ui/icon'
import { VThumbnail } from '@/shared/ui/thumbnail'
import type { ShootProduct } from '../model/shoot'
import ProgressBar from './ProgressBar.vue'

// Figma "Card / <product>" of the Products tab: photo, progress and a count per
// status (Figma "CMS / Shared / Status icon").
const { product, canOpen = false } = defineProps<{ product: ShootProduct; canOpen?: boolean }>()

const rows: {
  status: DeliverableStatus
  label: string
  icon: IconName
  tile: string
  count: string
}[] = [
  {
    status: 'approved',
    label: 'Approved',
    icon: 'checkmark-circle-01',
    tile: 'bg-mint-100 text-mint-400',
    count: 'text-mint-400',
  },
  {
    status: 'in_progress',
    label: 'In progress',
    icon: 'play',
    tile: 'bg-status-accent text-link',
    count: 'text-link',
  },
  {
    status: 'needs_changes',
    label: 'Needs changes',
    icon: 'file-view',
    tile: 'bg-red-100 text-red-400',
    count: 'text-red-400',
  },
  {
    status: 'to_shoot',
    label: 'To shoot',
    icon: 'camera-01',
    tile: 'bg-status-info text-status-info',
    count: 'text-status-info',
  },
]

const done = computed(() => `${product.counts.approved} / ${product.counts.total} deliverables`)
</script>

<template>
  <article
    class="flex gap-4 rounded-2xl bg-card p-4 shadow-[0_8px_16px_rgb(29_42_60/0.05)] md:shadow-none"
  >
    <VThumbnail
      :src="product.photoUrl"
      class="aspect-[9/16] w-[132px] self-start rounded-lg object-top"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <h3 class="text-p1 font-semibold break-words text-primary">{{ product.name }}</h3>
      <p v-if="product.subtitle" class="text-p3 font-medium text-secondary">
        {{ product.subtitle }}
      </p>
      <p class="text-p3 font-medium text-primary">{{ done }}</p>
      <ProgressBar :percent="product.percent" />
      <ul class="flex flex-col gap-3">
        <li
          v-for="row in rows"
          :key="row.status"
          class="flex items-center gap-2 text-p3 font-medium"
        >
          <span
            :class="['flex size-[26px] shrink-0 items-center justify-center rounded-lg', row.tile]"
          >
            <VIcon :name="row.icon" :size="16" />
          </span>
          <span :class="row.count">{{ product.counts[row.status] }}</span>
          <span class="text-secondary">{{ row.label }}</span>
        </li>
      </ul>
      <RouterLink
        v-if="canOpen"
        :to="{ name: 'product', params: { id: product.id } }"
        class="flex items-center gap-1.5 self-start text-p3 font-medium text-secondary transition-colors hover:text-brand"
      >
        View product
        <VIcon name="arrow-right-02-sharp" :size="14" />
      </RouterLink>
    </div>
  </article>
</template>
