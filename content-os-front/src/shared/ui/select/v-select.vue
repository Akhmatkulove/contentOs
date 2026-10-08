<script setup lang="ts" generic="T extends string">
import { computed, useAttrs, useId, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'
import SelectPlain from './select-plain.vue'
import SelectSearchable from './select-searchable.vue'
import { type IconName } from '@/shared/ui/icon'
import type { SelectOption, SelectVariant } from './select-styles'

defineOptions({ inheritAttrs: false })

// Select of Figma "CMS / Shared / Field": label, trigger, error message.
// `searchable` adds a search field inside the dropdown (Figma
// "Dropdown / collection") — use it for long or growing lists. The value type
// comes from `options`: with `as const` options it is their union, not string.
const {
  modelValue,
  options,
  label,
  placeholder = 'Select…',
  required = false,
  error,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyText = 'Nothing found',
  variant = 'field',
  icon,
  prefix,
  class: className,
} = defineProps<{
  modelValue?: T
  options: readonly SelectOption<T>[]
  label?: string
  placeholder?: string
  // Marks the label with an asterisk. No aria-required: Reka sets it on the
  // trigger from its own `required`, which would also make the hidden native
  // <select> required and let the browser stop the form before validation.
  required?: boolean
  // Error message; a non-empty string switches the field to the error state.
  error?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  emptyText?: string
  // filter: the 40px toolbar pill (Figma "Field / All types"); give it a
  // width and an aria-label instead of a label.
  variant?: SelectVariant
  // Leading icon in the trigger, e.g. arrow-up-down-sharp on a sort filter.
  icon?: IconName
  // Shown before the value in the trigger only: "Collection:" + "All collections"
  // (Figma "Field / Collection: All collections"). The options stay without it.
  prefix?: string
  // Applied to the root wrapper. Other attributes (aria-label, name, …) go
  // to the trigger button.
  class?: HTMLAttributes['class']
}>()

// Only an option's value comes out: a select never clears itself.
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

// The inner selects work with plain strings and only offer the options' values.
function pick(value: string | undefined) {
  if (value !== undefined) emit('update:modelValue', value as T)
}

const attrs = useAttrs()
const fallbackId = useId()
const id = computed(() => (attrs.id as string | undefined) ?? fallbackId)
const errorId = computed(() => `${id.value}-error`)

const triggerAttrs = computed(() => ({
  ...attrs,
  id: id.value,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? errorId.value : undefined,
}))
</script>

<template>
  <div :class="cn('flex min-w-0 flex-col gap-2', className)">
    <label v-if="label" :for="id" class="text-p3 font-medium text-secondary">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-red-400"> *</span>
    </label>

    <SelectSearchable
      v-if="searchable"
      :model-value="modelValue"
      @update:model-value="pick"
      :options="options"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="!!error"
      :trigger-attrs="triggerAttrs"
      :variant="variant"
      :icon="icon"
      :prefix="prefix"
      :search-placeholder="searchPlaceholder"
      :empty-text="emptyText"
    />
    <SelectPlain
      v-else
      :model-value="modelValue"
      @update:model-value="pick"
      :options="options"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="!!error"
      :trigger-attrs="triggerAttrs"
      :variant="variant"
      :icon="icon"
      :prefix="prefix"
    />

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
