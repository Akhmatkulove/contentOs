<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import type { SelectOption } from '@/shared/ui/select'

// One section of Figma "Sheet / Filters": label, optional search, options with
// a check on the picked one. Options with `photoUrl` (people) get an avatar.
const {
  label,
  options,
  searchable = false,
} = defineProps<{
  label: string
  options: readonly (SelectOption & { photoUrl?: string | null })[]
  searchable?: boolean
}>()

const model = defineModel<string>({ required: true })

const query = ref('')
// The picked option stays in the list even when the search skips it.
const visible = computed(() => {
  const needle = query.value.toLowerCase()
  if (!needle) return options
  return options.filter(
    (option) => option.value === model.value || option.label.toLowerCase().includes(needle),
  )
})

const labelId = useId()
</script>

<template>
  <section class="flex flex-col gap-2">
    <h3 :id="labelId" class="text-table font-medium text-secondary">{{ label }}</h3>
    <VSearch
      v-if="searchable"
      v-model="query"
      :debounce="0"
      placeholder="Search…"
      :aria-label="`Search ${label.toLowerCase()}`"
      class="h-10 rounded-lg bg-muted px-2.5 md:h-10 md:bg-muted md:pr-2.5"
    />
    <div role="radiogroup" :aria-labelledby="labelId" class="flex flex-col gap-0.5">
      <VButton
        v-for="option in visible"
        :key="option.value"
        variant="ghost"
        role="radio"
        :aria-checked="option.value === model"
        :class="[
          'h-10 w-full justify-between gap-2 rounded-lg px-3 text-left text-p2 font-medium',
          option.value === model ? 'bg-status-accent text-link' : 'text-primary',
        ]"
        @click="model = option.value"
      >
        <span class="flex min-w-0 items-center gap-2">
          <template v-if="option.photoUrl !== undefined && option.value !== 'all'">
            <img
              v-if="option.photoUrl"
              :src="option.photoUrl"
              alt=""
              class="size-6 shrink-0 rounded-full object-cover"
            />
            <span
              v-else
              aria-hidden="true"
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-mint-100 text-p3 font-medium text-mint-400"
            >
              {{ option.label.slice(0, 1).toUpperCase() }}
            </span>
          </template>
          <span class="truncate">{{ option.label }}</span>
        </span>
        <!-- Wrapped: a direct svg child changes VButton's padding. -->
        <span v-if="option.value === model" class="flex shrink-0">
          <VIcon name="tick-01" :size="16" />
        </span>
      </VButton>
    </div>
  </section>
</template>
