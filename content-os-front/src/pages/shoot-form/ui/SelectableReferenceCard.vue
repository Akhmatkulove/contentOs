<script setup lang="ts">
import { ReferenceCard, type Reference } from '@/entities/reference'
import { VCheckbox } from '@/shared/ui/checkbox'

// A reference picked for a shoot (the section and the reference bank): the
// app's ReferenceCard with a checkbox where the favourite star goes, and a
// click anywhere on the card ticks it.
const { reference } = defineProps<{ reference: Reference }>()

const selected = defineModel<boolean>('selected', { required: true })
</script>

<template>
  <div class="relative">
    <ReferenceCard :reference="reference">
      <template #action>
        <VCheckbox
          :model-value="selected"
          :aria-label="`Select ${reference.title}`"
          @update:model-value="selected = $event === true"
        />
      </template>
    </ReferenceCard>
    <!-- Mouse only: a click anywhere, the checkbox's spot included, ticks the card.
         Hidden from assistive tech and not focusable: the checkbox is the way there. -->
    <div
      aria-hidden="true"
      data-card-hit-area
      class="absolute inset-0 cursor-pointer"
      @click="selected = !selected"
    />
  </div>
</template>
