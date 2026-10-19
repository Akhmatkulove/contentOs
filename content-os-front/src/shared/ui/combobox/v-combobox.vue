<script setup lang="ts">
import { computed, ref, useAttrs, useId, type HTMLAttributes } from 'vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
  useFilter,
} from 'reka-ui'
import { cn } from '@/shared/lib'
import { VIcon } from '@/shared/ui/icon'
import { selectChevronClass, selectContentClass, selectItemClass } from '@/shared/ui/select'

defineOptions({ inheritAttrs: false })

// Free text with suggestions, on Reka Combobox. No Figma yet: the box follows
// VInput, the list follows VSelect. Typing filters `options`; a value that
// isn't among them is offered as "Create “…”" on top, so Enter keeps what was
// typed and the arrows reach the suggestions.
const {
  options,
  label,
  placeholder,
  error,
  disabled = false,
  class: className,
} = defineProps<{
  options: readonly string[]
  label?: string
  placeholder?: string
  // Error message; a non-empty string switches the field to the error state.
  error?: string
  disabled?: boolean
  // Applied to the root wrapper. Other attributes (maxlength, name, …) go
  // to the <input>.
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string>({ default: '' })

const attrs = useAttrs()
const fallbackId = useId()
const id = computed(() => (attrs.id as string | undefined) ?? fallbackId)
const errorId = computed(() => `${id.value}-error`)

const open = ref(false)

// Locale-aware, case- and accent-insensitive: "resort" finds "Résort 25".
const { contains } = useFilter({ sensitivity: 'base' })

const query = computed(() => model.value.trim())
const filtered = computed(() =>
  query.value ? options.filter((option) => contains(option, query.value)) : options,
)
// Same comparison as the backend: "summer 26" is the existing "Summer 26".
const newValue = computed(() => {
  const q = query.value.toLowerCase()
  return q && !options.some((option) => option.toLowerCase() === q) ? query.value : ''
})
const hasItems = computed(() => !!newValue.value || filtered.value.length > 0)

function pick(value: unknown) {
  if (typeof value === 'string') model.value = value
}
</script>

<template>
  <div :class="cn('flex w-full min-w-0 flex-col gap-2', className)">
    <label v-if="label" :for="id" class="text-p3 font-medium text-secondary">
      {{ label }}
    </label>

    <ComboboxRoot
      v-model:open="open"
      :model-value="model"
      :disabled="disabled"
      ignore-filter
      open-on-click
      :reset-search-term-on-blur="false"
      @update:model-value="pick"
    >
      <ComboboxAnchor
        :class="[
          'flex h-11 items-center gap-2 rounded-[10px] px-3 transition-colors',
          'has-[input:disabled]:border-neutral-300 has-[input:disabled]:bg-neutral-200',
          error
            ? 'border-[1.5px] border-red-400 bg-red-100'
            : 'border border-default bg-card focus-within:border-violet-400',
        ]"
      >
        <ComboboxInput
          v-bind="attrs"
          :id="id"
          v-model="model"
          :placeholder="placeholder"
          :aria-invalid="error ? true : undefined"
          :aria-describedby="error ? errorId : undefined"
          class="h-full w-full min-w-0 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-neutral-600 disabled:cursor-not-allowed disabled:text-secondary"
        />
        <ComboboxTrigger
          v-if="options.length"
          tabindex="-1"
          :aria-label="label ? `Show ${label.toLowerCase()} options` : 'Show options'"
          class="group flex shrink-0 items-center disabled:cursor-not-allowed"
        >
          <VIcon name="arrow-down-01-sharp" :size="16" :class="selectChevronClass" />
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal v-if="hasItems">
        <ComboboxContent
          position="popper"
          align="start"
          :side-offset="8"
          :class="[
            selectContentClass,
            'w-(--reka-combobox-trigger-width) min-w-60 [--available-height:var(--reka-combobox-content-available-height)]',
          ]"
        >
          <ComboboxViewport
            class="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain"
          >
            <ComboboxItem v-if="newValue" :value="newValue" :class="selectItemClass">
              <VIcon name="plus-sign" :size="16" class="shrink-0" />
              <span class="min-w-0 flex-1 truncate">Create “{{ newValue }}”</span>
            </ComboboxItem>
            <ComboboxItem
              v-for="option in filtered"
              :key="option"
              :value="option"
              :class="selectItemClass"
            >
              <span class="min-w-0 flex-1 truncate">{{ option }}</span>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
