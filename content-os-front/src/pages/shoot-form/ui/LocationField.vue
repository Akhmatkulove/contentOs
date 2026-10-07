<script setup lang="ts">
import { nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxRoot,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
} from 'reka-ui'
import { VIcon } from '@/shared/ui/icon'
import {
  selectChevronClass,
  selectContentClass,
  selectItemClass,
  selectTriggerClass,
} from '@/shared/ui/select'
import { useLocationSearch } from '../model/location-search'

// Figma "Form field / Location": looks like the other selects, but the list
// is Yandex address suggestions for the typed text, Uzbekistan only. The model
// is the picked address as text; only a suggestion can be picked.
const { label, placeholder = 'Search address' } = defineProps<{
  label: string
  placeholder?: string
}>()

const model = defineModel<string>({ default: '' })

const open = ref(false)
const trigger = useTemplateRef('trigger')
const id = useId()

const { query, suggestions, state } = useLocationSearch()

// Picking or Escape returns focus to the field, a click elsewhere leaves it
// there (as in VDatePicker: Reka refocuses only its own PopoverTrigger).
let clickedOutside = false
function onClickOutside() {
  clickedOutside = true
}

// A fresh search every time the list opens.
watch(open, (isOpen) => {
  if (isOpen) return
  query.value = ''
  if (!clickedOutside) void nextTick(() => trigger.value?.focus())
  clickedOutside = false
})

function pick(value: unknown) {
  if (typeof value === 'string') model.value = value
  open.value = false
}

const statusText = {
  idle: 'Type at least two letters',
  loading: 'Searching…',
  empty: 'No addresses found in Uzbekistan',
  error: 'Address search is unavailable. Try again later.',
} as const
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <label :for="id" class="text-p3 font-medium text-secondary">{{ label }}</label>

    <PopoverRoot v-model:open="open">
      <!-- Own button, not PopoverTrigger: that one replaces the id the <label> points at. -->
      <PopoverAnchor as-child>
        <button
          :id="id"
          ref="trigger"
          type="button"
          aria-haspopup="listbox"
          :aria-expanded="open"
          :data-state="open ? 'open' : 'closed'"
          :class="selectTriggerClass(false)"
          @click="open = !open"
        >
          <VIcon name="location-01" :size="16" class="shrink-0 text-brand" />
          <span :class="['min-w-0 flex-1 truncate', !model && 'text-neutral-600']">
            {{ model || placeholder }}
          </span>
          <VIcon name="arrow-down-01-sharp" :size="16" :class="selectChevronClass" />
        </button>
      </PopoverAnchor>

      <PopoverPortal>
        <PopoverContent
          align="start"
          :side-offset="8"
          :collision-padding="16"
          :class="[
            selectContentClass,
            'w-(--reka-popper-anchor-width) min-w-72 [--available-height:var(--reka-popover-content-available-height)]',
          ]"
          @close-auto-focus.prevent
          @pointer-down-outside="onClickOutside"
        >
          <!-- The backend filters: Listbox only moves the highlight and picks. -->
          <ListboxRoot
            :model-value="model || undefined"
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
                placeholder="Street, district, place…"
                aria-label="Search address"
                class="h-full min-w-0 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-secondary"
              />
            </label>

            <ListboxContent
              v-if="state === 'results'"
              class="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain"
            >
              <ListboxItem
                v-for="suggestion in suggestions"
                :key="suggestion.address"
                :value="suggestion.address"
                :class="[selectItemClass, 'h-auto min-h-10 py-2']"
              >
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="truncate">{{ suggestion.title }}</span>
                  <span v-if="suggestion.subtitle" class="truncate text-p3 text-secondary">
                    {{ suggestion.subtitle }}
                  </span>
                </span>
              </ListboxItem>
            </ListboxContent>

            <p v-else role="status" class="py-3 text-center text-p3 font-medium text-secondary">
              {{ statusText[state] }}
            </p>
          </ListboxRoot>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
