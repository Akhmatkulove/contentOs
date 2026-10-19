<script setup lang="ts">
import { deliverableTypes } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import type { BrandDeliverable } from '../model/brand-deliverable'
import BrandDeliverableAction from './BrandDeliverableAction.vue'
import BrandDeliverableDue from './BrandDeliverableDue.vue'
import BrandDeliverableShoots from './BrandDeliverableShoots.vue'

// The backlog rows (docs/adr/0019), in the look of Figma "Card / Task table".
// Scrolls sideways when the card is narrower than the columns.
const { deliverables } = defineProps<{ deliverables: BrandDeliverable[] }>()

const headCell = 'pr-2 text-left text-p3 font-medium whitespace-nowrap text-secondary'
</script>

<template>
  <!-- `relative` keeps absolutely positioned bits inside the scroll box, so the
       table can't widen the page. -->
  <div class="relative overflow-x-auto">
    <table class="w-full min-w-max border-collapse">
      <thead>
        <tr class="h-10 border-b border-subtle">
          <th scope="col" :class="[headCell, 'min-w-[218px]']">Deliverable</th>
          <th scope="col" :class="[headCell, 'min-w-[152px]']">Product</th>
          <th scope="col" :class="[headCell, 'min-w-[120px]']">Brand</th>
          <th scope="col" :class="[headCell, 'min-w-[126px]']">Status</th>
          <th scope="col" :class="[headCell, 'min-w-[120px]']">Shoots</th>
          <th scope="col" :class="[headCell, 'min-w-[94px]']">Due date</th>
          <th scope="col" :class="[headCell, 'min-w-[100px]']">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in deliverables"
          :key="item.id"
          class="h-22 border-b border-subtle whitespace-nowrap last:border-b-0"
        >
          <th scope="row" class="py-2 pr-2 text-left font-normal">
            <div class="flex max-w-72 flex-col gap-1 whitespace-normal">
              <span class="text-p2 font-semibold break-words text-primary">{{ item.name }}</span>
              <span class="text-p4 font-medium text-secondary">{{
                deliverableTypes[item.type]
              }}</span>
              <span v-if="item.brief" class="line-clamp-2 text-p4 font-medium text-secondary">
                {{ item.brief }}
              </span>
            </div>
          </th>
          <td class="pr-2">
            <RouterLink
              :to="{ name: 'product', params: { id: item.product.id } }"
              class="flex items-center gap-2 transition-colors hover:text-brand"
            >
              <VThumbnail
                :src="item.product.photoUrl"
                :icon-size="12"
                class="h-8.75 w-7 rounded-md"
              />
              <span class="flex flex-col gap-1 font-medium">
                <span class="text-p3 text-primary">{{ item.product.name }}</span>
                <span v-if="item.product.sku" class="text-p4 text-secondary">
                  {{ item.product.sku }}
                </span>
              </span>
            </RouterLink>
          </td>
          <td class="pr-2">
            <div class="flex items-center gap-2">
              <VAvatar :name="item.brand.name" :src="item.brand.photo_url" />
              <span class="text-p3 font-medium text-primary">{{
                item.brand.name || 'Unnamed'
              }}</span>
            </div>
          </td>
          <td class="pr-2">
            <VStatus :tone="item.status.tone" class="min-w-[118px]">{{
              item.status.label
            }}</VStatus>
          </td>
          <td class="pr-2">
            <BrandDeliverableShoots :deliverable="item" />
          </td>
          <td class="pr-2">
            <BrandDeliverableDue :deliverable="item" />
          </td>
          <td class="pr-2">
            <BrandDeliverableAction :deliverable="item" class="w-[112px]" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
