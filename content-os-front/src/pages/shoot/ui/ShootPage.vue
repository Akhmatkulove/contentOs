<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'

// TODO(ui): the shoot's page — not designed yet; Open shoot already leads here.
defineProps<{ id: string }>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <RouterLink
      :to="{ name: 'shoots' }"
      class="flex items-center gap-1.5 self-start text-p3 font-medium text-secondary transition-colors hover:text-brand"
    >
      <VIcon name="arrow-left-02-sharp" :size="14" />
      Back to shoots
    </RouterLink>
    <h1 class="text-h3 text-brand">Shoot</h1>
    <p class="text-p2 font-medium text-secondary">The shoot's page is coming soon.</p>
  </div>
</template>
