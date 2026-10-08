<script setup lang="ts">
import type { Reference } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSectionCard } from '@/shared/ui/section-card'
import { toggleSelection } from '../model/shoot-draft'
import SelectableReferenceCard from './SelectableReferenceCard.vue'

// Figma "Card / References for this shoot": references picked in the bank
// (searching and filtering happen there) and new ones, shown as SelectableReferenceCard.
const { references } = defineProps<{ references: Reference[] }>()

const selected = defineModel<string[]>('selected', { required: true })

// "Add reference" and "Browse reference bank": the form opens the modals.
const emit = defineEmits<{ add: []; browse: [] }>()

function setSelected(id: string, picked: boolean) {
  selected.value = toggleSelection(selected.value, id, picked)
}
</script>

<template>
  <VSectionCard
    title="References for this shoot"
    description="Attach references from your reference bank to guide the creative direction."
  >
    <template #action>
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <!-- Figma mobile has no "Add reference": the bank is the way in there. -->
        <VButton class="hidden md:inline-flex" @click="emit('add')">
          <VIcon name="plus-sign" />
          Add reference
        </VButton>
        <VButton variant="secondary" class="h-11 w-full md:h-10 md:w-auto" @click="emit('browse')">
          Browse reference bank
        </VButton>
      </div>
    </template>

    <!-- Cards keep the Figma width (230px) as in the product form, not stretched. -->
    <ul
      v-if="references.length"
      class="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,230px)] md:gap-5"
    >
      <li v-for="reference in references" :key="reference.id">
        <SelectableReferenceCard
          :reference="reference"
          :selected="selected.includes(reference.id)"
          @update:selected="setSelected(reference.id, $event)"
        />
      </li>
    </ul>
    <p
      v-else
      class="flex h-[117px] items-center justify-center rounded-[20px] bg-subtle p-8 text-center text-p1 font-medium text-secondary"
    >
      The references you add will be displayed here
    </p>
  </VSectionCard>
</template>
