<script setup lang="ts">
import { computed } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { deliverableStatuses, formatDueDate, type Deliverable } from '../model/deliverable'

// Figma "Card / Deliverables" table (desktop) without the Type and Reference
// columns. The screen may add a last column of row actions through the slot.
// Header and rows share one grid: headers line up with the cells and every gap
// is the same; the first column takes what is left.
const { deliverables } = defineProps<{ deliverables: Deliverable[] }>()

const slots = defineSlots<{ action?: (props: { deliverable: Deliverable }) => unknown }>()

const row = computed(() =>
  slots.action
    ? 'grid grid-cols-[minmax(200px,1fr)_150px_118px_96px_28px] items-center gap-x-5'
    : 'grid grid-cols-[minmax(200px,1fr)_150px_118px_96px] items-center gap-x-5',
)
const headCell = 'text-left text-p3 font-medium text-secondary'
</script>

<template>
  <!-- Scrolls sideways if the card can't fit the columns. -->
  <div class="overflow-x-auto">
    <div role="table" aria-label="Deliverables" class="min-w-[640px]">
      <div role="row" :class="[row, 'h-10']">
        <span role="columnheader" :class="headCell">Deliverable</span>
        <span role="columnheader" :class="headCell">Assigned to</span>
        <span role="columnheader" :class="headCell">Status</span>
        <span role="columnheader" :class="headCell">Due date</span>
        <span v-if="slots.action" role="columnheader"><span class="sr-only">Actions</span></span>
      </div>
      <div
        v-for="item in deliverables"
        :key="item.id"
        role="row"
        :class="[row, 'h-[100px] border-b border-subtle last:border-b-0']"
      >
        <div role="cell" class="flex min-w-0 items-center gap-3">
          <!-- TODO(api): thumbnail of the deliverable's content once shoots upload it. -->
          <span
            class="flex h-15 w-12 shrink-0 items-center justify-center rounded-lg bg-subtle text-tertiary"
            aria-hidden="true"
          >
            <VIcon name="image-01" :size="18" />
          </span>
          <div class="flex min-w-0 flex-col gap-1.5">
            <p class="truncate text-p2 font-semibold text-primary">{{ item.name }}</p>
            <p v-if="item.brief" class="truncate text-p3 font-medium text-secondary">
              {{ item.brief }}
            </p>
          </div>
        </div>
        <div role="cell" class="min-w-0">
          <div v-if="item.assignee" class="flex items-center gap-2">
            <VAvatar :name="item.assignee.name" :src="item.assignee.photo_url" />
            <span class="truncate text-p3 font-medium text-primary">
              {{ item.assignee.name || 'Unnamed' }}
            </span>
          </div>
          <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
        </div>
        <div role="cell">
          <VStatus :tone="deliverableStatuses[item.status].tone" class="w-full">
            {{ deliverableStatuses[item.status].label }}
          </VStatus>
        </div>
        <div role="cell" class="text-p3 font-medium text-secondary">
          {{ formatDueDate(item.dueDate) || '—' }}
        </div>
        <div v-if="slots.action" role="cell">
          <slot name="action" :deliverable="item" />
        </div>
      </div>
    </div>
  </div>
</template>
