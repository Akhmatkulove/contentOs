<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "Card / About": description, facts and tags. "+" after the tags opens
// the edit form at the details; only the owner gets it.
const {
  about,
  facts,
  tags,
  addTo = null,
} = defineProps<{
  about: string
  facts: { label: string; value: string }[]
  tags: string[]
  addTo?: RouteLocationRaw | null
}>()
</script>

<template>
  <section class="flex flex-col gap-4 rounded-2xl bg-card p-5" aria-labelledby="product-about">
    <h2 id="product-about" class="text-h5 text-primary">About</h2>
    <p class="text-p2 font-medium whitespace-pre-line text-secondary">{{ about }}</p>

    <dl v-if="facts.length" class="grid grid-cols-3 gap-4 md:flex md:gap-6">
      <div
        v-for="fact in facts"
        :key="fact.label"
        class="flex min-w-0 flex-col gap-1.5 md:w-[182px]"
      >
        <dt class="text-p3 font-medium text-secondary">{{ fact.label }}</dt>
        <dd class="truncate text-p2 font-semibold text-primary">{{ fact.value }}</dd>
      </div>
    </dl>

    <div v-if="tags.length || addTo" class="flex flex-col gap-2">
      <h3 class="text-p3 font-medium text-secondary">Tags</h3>
      <ul class="flex flex-wrap items-center gap-2">
        <li
          v-for="tag in tags"
          :key="tag"
          class="rounded-3xl bg-violet-100 px-5 py-3 text-p2 font-semibold text-link"
        >
          {{ tag }}
        </li>
        <li v-if="addTo">
          <VButton as-child variant="soft" class="h-8 w-10 rounded-3xl px-0">
            <RouterLink :to="addTo" aria-label="Add tags">
              <VIcon name="plus-sign" :size="16" />
            </RouterLink>
          </VButton>
        </li>
      </ul>
    </div>
  </section>
</template>
