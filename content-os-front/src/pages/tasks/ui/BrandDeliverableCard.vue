<script setup lang="ts">
import { deliverableTypes } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import type { BrandDeliverable } from '../model/brand-deliverable'
import BrandDeliverableAction from './BrandDeliverableAction.vue'
import BrandDeliverableDue from './BrandDeliverableDue.vue'
import BrandDeliverableShoots from './BrandDeliverableShoots.vue'

// A backlog row on mobile (docs/adr/0019), in the look of the My tasks card.
const { deliverable } = defineProps<{ deliverable: BrandDeliverable }>()
</script>

<template>
  <article
    class="flex flex-col gap-3 rounded-2xl bg-card p-3.5 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)]"
  >
    <div class="flex flex-col items-start gap-2 border-b border-subtle pb-3">
      <h3 class="text-table font-semibold break-words text-primary">{{ deliverable.name }}</h3>
      <div class="flex items-center gap-2">
        <VStatus :tone="deliverable.status.tone" :size="20">{{ deliverable.status.label }}</VStatus>
        <span class="text-p4 font-medium text-secondary">{{
          deliverableTypes[deliverable.type]
        }}</span>
      </div>
      <p v-if="deliverable.brief" class="line-clamp-3 text-p3 font-medium text-secondary">
        {{ deliverable.brief }}
      </p>
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2.5">
        <VThumbnail
          :src="deliverable.product.photoUrl"
          :icon-size="14"
          class="h-10 w-8 rounded-md"
        />
        <div class="flex min-w-0 flex-col gap-1 text-p3 font-medium">
          <span class="break-words text-primary">{{ deliverable.product.name }}</span>
          <span v-if="deliverable.product.sku" class="text-secondary">
            {{ deliverable.product.sku }}
          </span>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <VAvatar :name="deliverable.brand.name" :src="deliverable.brand.photo_url" />
        <span class="text-p3 font-medium text-primary">{{
          deliverable.brand.name || 'Unnamed'
        }}</span>
      </div>
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)_136px] gap-3">
      <BrandDeliverableShoots :deliverable="deliverable" />
      <BrandDeliverableDue :deliverable="deliverable" />
    </div>

    <BrandDeliverableAction :deliverable="deliverable" class="w-full" />
  </article>
</template>
