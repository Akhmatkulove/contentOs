<script setup lang="ts">
import { computed, useAttrs, useId, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'

defineOptions({ inheritAttrs: false })

// Textarea of Figma "CMS / Shared / Field": label, box, error message.
const {
  label,
  required = false,
  error,
  rows = 4,
  class: className,
} = defineProps<{
  label?: string
  // Marks the label with an asterisk and sets aria-required. Not the native
  // attribute: the browser's own popup would stop the form's validation.
  required?: boolean
  // Error message; a non-empty string switches the field to the error state.
  error?: string
  // Visible lines; 4 gives the 96px box from Figma. Give the root a height
  // (or flex-1) to make the box fill it instead.
  rows?: number
  // Applied to the root wrapper. Other attributes (placeholder, disabled,
  // name, maxlength, …) go to the <textarea>.
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string>()

const attrs = useAttrs()
const fallbackId = useId()
const id = computed(() => (attrs.id as string | undefined) ?? fallbackId)
const errorId = computed(() => `${id.value}-error`)
</script>

<template>
  <div :class="cn('flex min-w-0 flex-col gap-2', className)">
    <label v-if="label" :for="id" class="text-p3 font-medium text-secondary">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-red-400"> *</span>
    </label>

    <textarea
      v-bind="attrs"
      :id="id"
      v-model="model"
      :rows="rows"
      :aria-required="required || undefined"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? errorId : undefined"
      :class="[
        'w-full min-w-0 grow resize-none rounded-[10px] p-3 text-p2 font-medium text-brand transition-colors outline-none placeholder:text-neutral-600',
        'disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-secondary',
        error
          ? 'border-[1.5px] border-red-400 bg-red-100'
          : 'border border-default bg-card focus:border-violet-400',
      ]"
    />

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
