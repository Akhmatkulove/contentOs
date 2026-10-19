<script setup lang="ts">
import { ReferenceCard, type Reference } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'

// Figma "Card / Shoot covers": the task's references, then "+N" — a tile that
// loads the rest of them in place.
// TODO(ui): the favourite star — starring lives on the references page for now.
const { references, more, loading } = defineProps<{
  references: Reference[]
  more: number
  loading: boolean
}>()
defineEmits<{ loadMore: [] }>()
</script>

<template>
  <section aria-label="References" class="rounded-2xl bg-card p-4">
    <ul
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      :aria-busy="loading || undefined"
    >
      <li v-for="reference in references" :key="reference.id" class="min-w-0">
        <ReferenceCard
          :reference="reference"
          :to="{ name: 'reference', params: { id: reference.id } }"
          :favorite-toggle="false"
        />
      </li>
      <!-- Figma "More from shoot": as tall as a card's preview on desktop. -->
      <li v-if="more" class="min-w-0">
        <VButton
          variant="ghost"
          :disabled="loading"
          class="flex aspect-[9/16] h-auto w-full flex-col gap-2 rounded-xl bg-subtle hover:bg-muted active:bg-muted md:rounded-2xl"
          @click="$emit('loadMore')"
        >
          <span class="text-h4 text-brand">+{{ more }}</span>
          <span class="text-p3 font-medium text-secondary">
            {{ loading ? 'Loading…' : 'More from this task' }}
          </span>
        </VButton>
      </li>
    </ul>
  </section>
</template>
