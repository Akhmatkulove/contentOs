<script setup lang="ts">
import { computed, useAttrs, useId, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'
import SelectPlain from './select-plain.vue'
import SelectSearchable from './select-searchable.vue'
import type { SelectOption } from './select-styles'

defineOptions({ inheritAttrs: false })

// Select of Figma "CMS / Shared / Field": label, trigger, error message.
// `searchable` adds a search field inside the dropdown (Figma
// "Dropdown / collection") — use it for long or growing lists.
const {
  options,
  label,
  placeholder = 'Select…',
  error,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyText = 'Nothing found',
  class: className,
} = defineProps<{
  options: readonly SelectOption[]
  label?: string
  placeholder?: string
  // Error message; a non-empty string switches the field to the error state.
  error?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  emptyText?: string
  // Applied to the root wrapper. Other attributes (aria-label, name, …) go
  // to the trigger button.
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string>()

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
      {{ label }}
    </label>

    <SelectSearchable
      v-if="searchable"
      v-model="model"
      :options="options"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="!!error"
      :trigger-attrs="triggerAttrs"
      :search-placeholder="searchPlaceholder"
      :empty-text="emptyText"
    />
    <SelectPlain
      v-else
      v-model="model"
      :options="options"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="!!error"
      :trigger-attrs="triggerAttrs"
    />

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
