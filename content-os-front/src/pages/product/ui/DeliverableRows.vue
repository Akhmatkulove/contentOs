<script setup lang="ts">
import { deliverableStatuses, formatDueDate, type Deliverable } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'

// Figma "Deliverable / …" rows of the mobile product page.
// TODO(api): media type badge (Video, Photo) and the content thumbnail — deliverables
// have neither yet.
const { deliverables } = defineProps<{ deliverables: Deliverable[] }>()
</script>

<template>
  <ul class="flex flex-col">
    <li
      v-for="item in deliverables"
      :key="item.id"
      class="flex flex-col gap-2.5 border-b border-subtle py-3.5 last:border-b-0"
    >
      <div class="flex items-center gap-3">
        <span
          class="flex h-15 w-12 shrink-0 items-center justify-center rounded-lg bg-subtle text-tertiary"
          aria-hidden="true"
        >
          <VIcon name="image-01" :size="18" />
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <p class="text-p2 font-semibold text-primary">{{ item.name }}</p>
          <p v-if="item.brief" class="line-clamp-2 text-p3 font-medium text-secondary">
            {{ item.brief }}
          </p>
        </div>
        <VStatus :tone="deliverableStatuses[item.status].tone" class="min-w-[118px]">
          {{ deliverableStatuses[item.status].label }}
        </VStatus>
      </div>
      <div class="flex min-h-7 items-center gap-3 pl-15">
        <div v-if="item.assignee" class="flex min-w-0 items-center gap-2">
          <VAvatar :name="item.assignee.name" :src="item.assignee.photo_url" />
          <span class="truncate text-p3 font-medium text-primary">
            {{ item.assignee.name || 'Unnamed' }}
          </span>
        </div>
        <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
        <span v-if="item.dueDate" class="shrink-0 text-p3 font-medium text-secondary">
          {{ formatDueDate(item.dueDate) }}
        </span>
      </div>
    </li>
  </ul>
</template>
