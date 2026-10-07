<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import { VSectionCard } from '@/shared/ui/section-card'
import { VSelect } from '@/shared/ui/select'
import { toggleSelection, type ShootReference } from '../model/shoot-draft'
import { sourceFilterOptions } from '../model/shoot-options'
import ShootReferenceCard from './ShootReferenceCard.vue'

// Figma "Card / References for this shoot": references picked from the bank,
// filtered by source and searched. Two per row on mobile, four on desktop.
const { references } = defineProps<{ references: ShootReference[] }>()

const search = defineModel<string>('search', { required: true })
const source = defineModel<string>('source', { required: true })
const selected = defineModel<string[]>('selected', { required: true })

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
        <!-- TODO(ui): reference bank picker (not in Figma yet). -->
        <VButton variant="secondary" class="h-11 w-full md:h-10 md:w-auto">
          Browse reference bank
        </VButton>
      </div>
    </template>

    <div class="flex items-center gap-3">
      <VSelect
        v-model="source"
        :options="sourceFilterOptions"
        variant="filter"
        aria-label="Source"
        class="hidden w-[180px] md:flex"
      />
      <VSearch
        v-model="search"
        placeholder="Search reference bank…"
        aria-label="Search reference bank"
        class="min-w-0 flex-1"
      />
      <!-- TODO(ui): mobile filters sheet (the source) — Figma "CMS / Mobile / Filter button". -->
      <VButton variant="secondary" size="icon-32" aria-label="Filters" class="md:hidden">
        <VIcon name="filter-horizontal" :size="16" />
      </VButton>
    </div>

    <ul class="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      <li v-for="reference in references" :key="reference.id">
        <ShootReferenceCard
          :reference="reference"
          :selected="selected.includes(reference.id)"
          @update:selected="setSelected(reference.id, $event)"
        />
      </li>
    </ul>
  </VSectionCard>
</template>
