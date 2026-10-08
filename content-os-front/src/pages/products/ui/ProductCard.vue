<script setup lang="ts">
import { computed } from 'vue'
import { productStatuses } from '@/entities/product'
import { ProductActionsMenu } from '@/features/product-actions'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { productSubtitle, type Product } from '../model/product'

const { product, canEdit = false } = defineProps<{
  product: Product
  // The brand that owns it: Edit and Archive in the "…" menu.
  canEdit?: boolean
}>()

const status = computed(() => productStatuses[product.status])
const subtitle = computed(() => productSubtitle(product))
</script>

<!-- On mobile the photo runs edge to edge and only the text is padded.
     The whole card opens the product: the title link stretches over it (::after),
     and the actions button sits above that layer, so no button is nested in a link. -->
<template>
  <article
    class="relative flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-2xl bg-card pb-3 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-violet-300 md:p-3"
  >
    <div class="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted md:aspect-[4/5]">
      <img
        v-if="product.photoUrl"
        :src="product.photoUrl"
        alt=""
        loading="lazy"
        class="size-full object-cover object-top"
      />
      <VStatus :tone="status.tone" class="absolute bottom-2.5 left-2.5 md:bottom-3 md:left-3">
        {{ status.label }}
      </VStatus>
      <ProductActionsMenu :product="product" :can-edit="canEdit">
        <template #trigger>
          <!-- Open: Figma outlines the button in violet. -->
          <VButton
            variant="surface"
            size="icon-24"
            :aria-label="`${product.name} actions`"
            class="absolute top-2.5 right-2.5 z-10 data-[state=open]:inset-ring-[1.5px] data-[state=open]:inset-ring-violet-400 md:top-3 md:right-3 md:size-10"
          >
            <VIcon name="more-horizontal" class="size-[15px] md:size-[18px]" />
          </VButton>
        </template>
      </ProductActionsMenu>
    </div>

    <div class="flex flex-col gap-1 px-3 md:px-0">
      <h3 class="truncate text-p2 font-semibold text-brand md:text-p1">
        <RouterLink
          :to="{ name: 'product', params: { id: product.id } }"
          class="outline-none after:absolute after:inset-0"
        >
          {{ product.name }}
        </RouterLink>
      </h3>
      <p v-if="subtitle" class="truncate text-p3 font-medium text-secondary">
        {{ subtitle }}
      </p>
    </div>

    <!-- TODO(api): deliverables. Hidden until ProductListItem has their counts (deliveryPercent in model).
    <div class="flex flex-col gap-2 px-3 md:px-0">
      <div class="flex items-center justify-between gap-2 text-p3 font-medium">
        <span class="truncate text-secondary">
          {{ product.deliverables.done }} / {{ product.deliverables.total }} deliverables
        </span>
        <span class="text-brand">{{ percent }}%</span>
      </div>
      <div
        role="progressbar"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Deliverables done"
        class="h-1.5 overflow-hidden rounded-[3px] bg-neutral-300"
      >
        <div class="h-full rounded-[3px] bg-violet-400" :style="{ width: `${percent}%` }" />
      </div>
    </div>
    -->
  </article>
</template>
