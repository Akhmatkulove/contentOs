<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import type { BrandDeliverable } from '../model/brand-deliverable'

// Plan shoot (Soft) for a deliverable no shoot closes yet, View (Secondary)
// otherwise; the look of Figma "Row action".
const { deliverable } = defineProps<{ deliverable: BrandDeliverable }>()
</script>

<template>
  <VButton
    as-child
    :variant="deliverable.action.kind === 'view' ? 'secondary' : 'soft'"
    size="36"
    class="gap-1.5 px-3 text-p3 font-medium [&>svg]:size-3.5"
  >
    <RouterLink
      :to="deliverable.action.to"
      :aria-label="`${deliverable.action.label} ${deliverable.name}`"
    >
      <VIcon :name="deliverable.action.kind === 'view' ? 'link-square-01' : 'plus-sign'" />
      {{ deliverable.action.label }}
    </RouterLink>
  </VButton>
</template>
