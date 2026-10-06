<script setup lang="ts">
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// "Clear filters" next to the results: a soft pill with a cross and how many
// things narrow the list (search and filters). Not in Figma yet: built from
// the soft button and the status-accent colours.
const { count } = defineProps<{ count: number }>()
const emit = defineEmits<{ clear: [] }>()

const label = computed(() => `Clear ${count} ${count === 1 ? 'filter' : 'filters'}`)
</script>

<template>
  <VButton
    variant="soft"
    size="28"
    :aria-label="label"
    class="gap-1.5 pr-1.5 pl-2.5"
    @click="emit('clear')"
  >
    <span class="flex shrink-0"><VIcon name="multiplication-sign" :size="12" /></span>
    Clear filters
    <span
      aria-hidden="true"
      class="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-action-accent text-p4 font-medium text-inverse"
    >
      {{ count }}
    </span>
  </VButton>
</template>
