<script setup lang="ts" generic="T extends { id: string }">
import { computed, ref, watch } from 'vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  useFilter,
} from 'reka-ui'
import { VIcon } from '@/shared/ui/icon'
import { selectContentClass, selectItemClass } from '@/shared/ui/select'

// Searchable picker styled as the select dropdowns (people in "Card / Team",
// people and references in "Add deliverable"; not in Figma yet). The trigger
// comes from the default slot, each row's content from the `item` slot.
// `multiple` keeps the list open and ticks items on and off; otherwise one pick
// closes it. The picker only reports what was clicked: the form decides.
const {
  items,
  selected,
  text,
  multiple = false,
  label,
  searchPlaceholder = 'Search by name…',
  emptyText,
} = defineProps<{
  items: T[]
  selected: string[]
  // What the search matches against: a name, a title.
  text: (item: T) => string
  multiple?: boolean
  // Names the list for screen readers: "Creators", "References".
  label: string
  searchPlaceholder?: string
  // Shown when there is nothing to pick at all; a search that finds nothing
  // says "Nothing found".
  emptyText: string
}>()

const emit = defineEmits<{ toggle: [id: string] }>()

defineSlots<{
  default(props: { open: boolean }): unknown
  item(props: { item: T }): unknown
}>()

const open = ref(false)
const query = ref('')

const { contains } = useFilter({ sensitivity: 'base' })
const filtered = computed(() => {
  const q = query.value.trim()
  return q ? items.filter((item) => contains(text(item), q)) : items
})

// A fresh search every time the list opens.
watch(open, (isOpen) => {
  if (!isOpen) query.value = ''
})

// Listbox reports the whole new selection; the form wants the one id clicked.
function onChange(value: unknown) {
  const next = Array.isArray(value) ? (value as string[]) : value ? [value as string] : []
  const clicked =
    next.find((id) => !selected.includes(id)) ?? selected.find((id) => !next.includes(id))
  if (clicked) emit('toggle', clicked)
  if (!multiple) open.value = false
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <slot :open="open" />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        align="start"
        :side-offset="8"
        :collision-padding="16"
        :class="[
          selectContentClass,
          'w-72 min-w-(--reka-popover-trigger-width) [--available-height:var(--reka-popover-content-available-height)]',
        ]"
      >
        <ListboxRoot
          :model-value="multiple ? selected : selected[0]"
          :multiple="multiple"
          :selection-behavior="multiple ? 'toggle' : 'replace'"
          highlight-on-hover
          :aria-label="label"
          class="flex min-h-0 flex-col gap-0.5"
          @update:model-value="onChange"
        >
          <label
            class="flex h-10 shrink-0 cursor-text items-center gap-2 rounded-lg bg-subtle px-2.5 text-secondary"
          >
            <VIcon name="search" :size="16" />
            <ListboxFilter
              v-model="query"
              auto-focus
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder.replace(/…$/, '')"
              class="h-full min-w-0 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-secondary"
            />
          </label>

          <ListboxContent
            v-if="filtered.length"
            class="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain"
          >
            <ListboxItem
              v-for="item in filtered"
              :key="item.id"
              :value="item.id"
              :class="selectItemClass"
            >
              <slot name="item" :item="item" />
              <ListboxItemIndicator><VIcon name="tick-01" :size="16" /></ListboxItemIndicator>
            </ListboxItem>
          </ListboxContent>

          <p v-else role="status" class="px-2 py-3 text-center text-p3 font-medium text-secondary">
            {{ items.length ? 'Nothing found' : emptyText }}
          </p>
        </ListboxRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
