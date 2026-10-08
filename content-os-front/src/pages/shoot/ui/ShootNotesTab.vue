<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import type { ShootNote } from '../api/notes'
import { noteFilterOptions, type NoteFilter } from '../model/notes'
import NoteCard from './NoteCard.vue'

// Figma "Shoot / Notes": pinned notes across the page, the rest two per row
// on desktop. Anyone on the shoot writes notes (docs/adr/0010).
// TODO(ui): mobile filters sheet.
const { pinned, others, loading, total } = defineProps<{
  pinned: ShootNote[]
  others: ShootNote[]
  loading: boolean
  total: number
}>()

const search = defineModel<string>('search', { required: true })
const filter = defineModel<NoteFilter>('filter', { required: true })

const emit = defineEmits<{
  create: []
  edit: [note: ShootNote]
  pin: [note: ShootNote]
  remove: [note: ShootNote]
}>()

function setFilter(value: string | undefined) {
  if (value) filter.value = value as NoteFilter
}
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <section
      aria-label="Search and filters"
      class="flex flex-wrap items-center gap-2.5 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
    >
      <VSearch
        v-model="search"
        placeholder="Search notes…"
        aria-label="Search notes"
        class="min-w-0 flex-1 md:min-w-60"
      />
      <VSelect
        :model-value="filter"
        :options="noteFilterOptions"
        variant="filter"
        aria-label="Filter notes"
        class="hidden w-[190px] md:block"
        @update:model-value="setFilter"
      />
      <VButton class="hidden md:inline-flex md:px-5" @click="emit('create')">
        <VIcon name="plus-sign" />
        New note
      </VButton>
    </section>

    <!-- Mobile: New note and the filter under the search (Figma). -->
    <div class="flex flex-col gap-3 md:hidden">
      <VButton class="h-11 w-full" @click="emit('create')">
        <VIcon name="plus-sign" />
        New note
      </VButton>
      <VSelect
        :model-value="filter"
        :options="noteFilterOptions"
        aria-label="Filter notes"
        @update:model-value="setFilter"
      />
    </div>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>
    <!-- TODO(ui): empty state — not in Figma; notes start empty. -->
    <p
      v-else-if="!pinned.length && !others.length"
      class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary"
    >
      {{ total ? 'No notes match the search or filter.' : 'No notes yet. Add the first one.' }}
    </p>
    <template v-else>
      <NoteCard
        v-for="note in pinned"
        :key="note.id"
        :note="note"
        @edit="emit('edit', note)"
        @pin="emit('pin', note)"
        @remove="emit('remove', note)"
      />
      <div v-if="others.length" class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
        <NoteCard
          v-for="note in others"
          :key="note.id"
          :note="note"
          @edit="emit('edit', note)"
          @pin="emit('pin', note)"
          @remove="emit('remove', note)"
        />
      </div>
    </template>
  </div>
</template>
