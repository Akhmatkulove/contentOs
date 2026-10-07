<script setup lang="ts">
import { ReferenceCard, type Reference } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VCheckbox } from '@/shared/ui/checkbox'
import { VIcon } from '@/shared/ui/icon'
import { VSectionCard } from '@/shared/ui/section-card'
import { toggleSelection } from '../model/shoot-draft'

// Figma "Card / References for this shoot": references picked in the bank
// (searching and filtering happen there). The cards are the app's
// ReferenceCard, with a checkbox where the favourite star usually is.
const { references } = defineProps<{ references: Reference[] }>()

const selected = defineModel<string[]>('selected', { required: true })

// "Browse reference bank": the form opens the picker.
const emit = defineEmits<{ browse: [] }>()

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
        <!-- TODO(ui): add-reference modal for a shoot. -->
        <VButton class="hidden md:inline-flex">
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
        <ReferenceCard :reference="reference">
          <template #action>
            <VCheckbox
              :model-value="selected.includes(reference.id)"
              :aria-label="`Select ${reference.title}`"
              @update:model-value="setSelected(reference.id, $event === true)"
            />
          </template>
        </ReferenceCard>
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
