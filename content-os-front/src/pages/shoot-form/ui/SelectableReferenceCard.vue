<script setup lang="ts">
import { ReferenceCard, type Reference } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VCheckbox } from '@/shared/ui/checkbox'
import { VIcon } from '@/shared/ui/icon'

// A reference picked for a shoot (the section and the reference bank): the
// app's ReferenceCard with a checkbox where the favourite star goes, and a
// click anywhere on the card ticks it. Preview under it opens the reference
// page in a new tab, so the form being filled stays as it is.
const { reference } = defineProps<{ reference: Reference }>()

const selected = defineModel<boolean>('selected', { required: true })
</script>

<template>
  <div class="relative flex flex-col gap-2">
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
    <!-- Above the click layer (z-10): it opens the page, it doesn't tick. -->
    <VButton
      as-child
      variant="soft"
      size="28"
      class="relative z-10 gap-1 self-start [&>svg]:size-3.5"
    >
      <RouterLink
        :to="{ name: 'reference', params: { id: reference.id } }"
        target="_blank"
        rel="noopener"
        :aria-label="`Preview ${reference.title} in a new tab`"
      >
        Preview
        <VIcon name="arrow-right-02-sharp" />
      </RouterLink>
    </VButton>
  </div>
</template>
