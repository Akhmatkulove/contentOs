<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  ListboxVirtualizer,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  useFilter,
} from 'reka-ui'
import { VIcon } from '@/shared/ui/icon'
import {
  chevronClass,
  contentClass,
  itemClass,
  triggerClass,
  type SelectOption,
} from './select-styles'

// Dropdown with a search field inside, on Reka Popover + Listbox. The filter
// keeps focus while arrows move the highlight and Enter picks it.
const { options, placeholder, disabled, invalid, triggerAttrs, searchPlaceholder, emptyText } =
  defineProps<{
    options: readonly SelectOption[]
    placeholder: string
    disabled: boolean
    invalid: boolean
    triggerAttrs: Record<string, unknown>
    searchPlaceholder: string
    emptyText: string
  }>()

const model = defineModel<string>()

// Above this many options only the visible rows are rendered.
const VIRTUALIZE_FROM = 50

const open = ref(false)
const query = ref('')

// Locale-aware, case- and accent-insensitive: "resort" finds "Résort 25".
const { contains } = useFilter({ sensitivity: 'base' })

const filtered = computed(() => {
  const q = query.value.trim()
  // ListboxVirtualizer types its options as mutable; nothing here mutates them.
  return (q ? options.filter((option) => contains(option.label, q)) : options) as SelectOption[]
})

const labels = computed(() => new Map(options.map((option) => [option.value, option.label])))
const selectedLabel = computed(() =>
  model.value === undefined ? undefined : labels.value.get(model.value),
)

// Decided per list, not per query: Listbox switches to virtual mode once.
const virtual = computed(() => options.length > VIRTUALIZE_FROM)

// A fresh search every time the list opens.
watch(open, (isOpen) => {
  if (!isOpen) query.value = ''
})

function pick(value: unknown) {
  if (typeof value === 'string') model.value = value
  open.value = false
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger
      v-bind="triggerAttrs"
      :disabled="disabled"
      aria-haspopup="listbox"
      :class="triggerClass(invalid)"
    >
      <span :class="['min-w-0 flex-1 truncate', !selectedLabel && 'text-neutral-600']">
        {{ selectedLabel ?? placeholder }}
      </span>
      <VIcon name="arrow-down-01-sharp" :size="16" :class="chevronClass" />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        align="start"
        :side-offset="8"
        :class="[
          contentClass,
          'w-(--reka-popover-trigger-width) min-w-60 [--available-height:var(--reka-popover-content-available-height)]',
        ]"
      >
        <ListboxRoot
          :key="virtual ? 'virtual' : 'plain'"
          :model-value="model"
          selection-behavior="replace"
          highlight-on-hover
          class="flex min-h-0 flex-col gap-0.5"
          @update:model-value="pick"
        >
          <label
            class="flex h-10 shrink-0 cursor-text items-center gap-2 rounded-lg bg-subtle px-2.5 text-secondary"
          >
            <VIcon name="search" :size="16" />
            <ListboxFilter
              v-model="query"
              auto-focus
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder"
              class="h-full min-w-0 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-secondary"
            />
          </label>

          <ListboxContent class="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain">
            <ListboxVirtualizer
              v-if="virtual"
              v-slot="{ option }"
              :options="filtered"
              :estimate-size="40"
              :text-content="(option: SelectOption) => option.label"
            >
              <ListboxItem :value="option.value" :disabled="option.disabled" :class="itemClass">
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
                <ListboxItemIndicator><VIcon name="tick-01" :size="16" /></ListboxItemIndicator>
              </ListboxItem>
            </ListboxVirtualizer>
            <template v-else>
              <ListboxItem
                v-for="option in filtered"
                :key="option.value"
                :value="option.value"
                :disabled="option.disabled"
                :class="itemClass"
              >
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
                <ListboxItemIndicator><VIcon name="tick-01" :size="16" /></ListboxItemIndicator>
              </ListboxItem>
            </template>
          </ListboxContent>

          <p
            v-if="filtered.length === 0"
            role="status"
            class="py-3 text-center text-p3 font-medium text-secondary"
          >
            {{ emptyText }}
          </p>
        </ListboxRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
