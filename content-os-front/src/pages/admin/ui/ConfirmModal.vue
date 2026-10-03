<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VModal } from '@/shared/ui/modal'

const { title, description, confirmLabel } = defineProps<{
  title: string
  description: string
  confirmLabel: string
}>()

// Closes with true when confirmed; nothing when cancelled or dismissed.
const emit = defineEmits<{ close: [confirmed?: true] }>()
</script>

<template>
  <VModal :title="title" class="md:max-w-110">
    <p class="text-p2 font-medium text-secondary">{{ description }}</p>

    <template #footer>
      <div class="flex items-center gap-2.5 md:justify-end">
        <VButton
          variant="secondary"
          class="flex-1 md:w-[150px] md:flex-none"
          @click="emit('close')"
        >
          Cancel
        </VButton>
        <VButton class="flex-1 md:w-[150px] md:flex-none" @click="emit('close', true)">
          {{ confirmLabel }}
        </VButton>
      </div>
    </template>
  </VModal>
</template>
