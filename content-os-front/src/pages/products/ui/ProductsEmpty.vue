<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
</script>

<!-- Not in Figma yet: built from the page's tokens.
     TODO(ui): VEmpty in shared/ui once a second page needs an empty state. -->
<template>
  <section
    class="flex flex-col items-center rounded-2xl bg-card px-6 py-12 text-center shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:min-h-[480px] md:justify-center md:py-16 md:shadow-none"
  >
    <div class="relative flex size-32 items-center justify-center" aria-hidden="true">
      <span class="absolute inset-0 rounded-full bg-status-accent/50" />
      <span class="absolute inset-4 rounded-full bg-status-accent" />
      <span class="absolute top-3 right-5 size-3 rounded-full bg-action-primary" />
      <span class="absolute bottom-5 left-3 size-2 rounded-full bg-violet-200" />
      <span
        class="relative flex size-14 -rotate-6 items-center justify-center rounded-2xl bg-action-accent text-inverse shadow-[0_12px_24px_rgb(76_34_97/0.25)]"
      >
        <VIcon name="package" :size="28" />
      </span>
    </div>

    <h2 class="mt-6 text-h6 text-brand md:text-h4">No products yet</h2>
    <p class="mt-2 max-w-[360px] text-p2 font-medium text-secondary">
      Add your first product to plan its shoots, track deliverables and keep all its content in one
      place.
    </p>

    <VButton as-child class="mt-6 w-full max-w-[280px] md:w-auto">
      <RouterLink :to="{ name: 'product-create' }">
        <VIcon name="plus-sign" :size="16" />
        Add product
      </RouterLink>
    </VButton>
  </section>
</template>
