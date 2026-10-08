<script setup lang="ts">
import { computed } from 'vue'
import { deliverableStatuses, formatDueDate } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { firstAndMore, type ShootDeliverable } from '../model/shoot-draft'
import { VThumbnail } from '@/shared/ui/thumbnail'

// Figma "Task / …" (mobile) under "Card / Deliverables for this shoot": the
// deliverable with its status, product and references, assignees and due date.
const { deliverable } = defineProps<{ deliverable: ShootDeliverable }>()

// × takes the deliverable out of the shoot.
const emit = defineEmits<{ remove: [] }>()

const media = computed(() => [
  { label: 'Product', value: deliverable.product.name, src: deliverable.product.photoUrl },
  {
    label: 'Reference',
    value: firstAndMore(deliverable.references.map((reference) => reference.title)) || '—',
    src: deliverable.references[0]?.previewUrl ?? null,
  },
])
</script>

<template>
  <article
    class="flex flex-col gap-4 rounded-[20px] bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)]"
  >
    <div class="flex items-start gap-3">
      <div class="flex min-w-0 flex-1 flex-col items-start gap-2">
        <h3 class="w-full truncate text-p1 font-semibold text-primary">{{ deliverable.name }}</h3>
        <VStatus :tone="deliverableStatuses[deliverable.status].tone" :size="24">
          {{ deliverableStatuses[deliverable.status].label }}
        </VStatus>
      </div>
      <VButton
        variant="ghost"
        size="icon-24"
        :aria-label="`Remove ${deliverable.name}`"
        class="size-7 text-secondary hover:text-primary"
        @click="emit('remove')"
      >
        <VIcon name="multiplication-sign" :size="18" />
      </VButton>
    </div>

    <!-- A <dl> can't hold the thumbnails next to its terms, so plain text here. -->
    <div class="flex flex-col gap-3 rounded-xl bg-subtle p-3">
      <div v-for="row in media" :key="row.label" class="flex items-center gap-3">
        <VThumbnail :src="row.src" :icon-size="14" class="h-10 w-8 rounded-lg" />
        <div class="flex min-w-0 flex-col gap-1">
          <p class="text-p4 font-medium text-secondary">{{ row.label }}</p>
          <p class="truncate text-table font-medium text-primary">{{ row.value }}</p>
        </div>
      </div>
    </div>

    <dl class="grid grid-cols-2 gap-4">
      <div class="flex min-w-0 flex-col gap-2">
        <dt class="text-p4 font-medium text-secondary">Assignee</dt>
        <dd class="flex h-7 items-center gap-2 text-table font-medium text-primary">
          <template v-if="deliverable.assignees.length">
            <span class="flex shrink-0 -space-x-2">
              <VAvatar
                v-for="member in deliverable.assignees.slice(0, 3)"
                :key="member.id"
                :name="member.name"
                :src="member.photo_url"
                class="ring-2 ring-card"
              />
            </span>
            <span class="truncate">{{
              firstAndMore(deliverable.assignees.map((member) => member.name || 'Unnamed'))
            }}</span>
          </template>
          <span v-else class="text-secondary">Unassigned</span>
        </dd>
      </div>
      <div class="flex min-w-0 flex-col gap-2">
        <dt class="text-p4 font-medium text-secondary">Due date</dt>
        <dd class="flex h-7 items-center gap-2 text-table font-medium text-primary">
          <VIcon name="calendar-02" :size="16" class="shrink-0 text-secondary" />
          {{ formatDueDate(deliverable.dueDate) || '—' }}
        </dd>
      </div>
    </dl>
  </article>
</template>
