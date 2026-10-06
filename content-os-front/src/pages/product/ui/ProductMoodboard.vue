<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { Schemas } from '@/shared/api'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "Card / Moodboard": images from the product's references, three per row.
// Edit opens the form at References; only the owner gets it.
const { images, editTo = null } = defineProps<{
  images: Schemas['FileResponse'][]
  editTo?: RouteLocationRaw | null
}>()
</script>

<template>
  <section class="flex flex-col gap-4 rounded-2xl bg-card p-5" aria-labelledby="product-moodboard">
    <div class="flex items-center justify-between gap-3">
      <h2 id="product-moodboard" class="text-h5 text-primary">Moodboard</h2>
      <VButton v-if="editTo" as-child variant="secondary" size="36">
        <RouterLink :to="editTo">
          <VIcon name="edit-02" />
          Edit
        </RouterLink>
      </VButton>
    </div>
    <ul v-if="images.length" class="grid grid-cols-3 gap-3">
      <li v-for="image in images" :key="image.id" class="aspect-[9/16] overflow-hidden rounded-lg">
        <img :src="image.url" alt="" loading="lazy" class="size-full bg-muted object-cover" />
      </li>
    </ul>
    <!-- TODO(ui): empty moodboard — not in Figma yet. -->
    <p v-else class="text-p2 font-medium text-secondary">
      Add image references to build the moodboard.
    </p>
  </section>
</template>
