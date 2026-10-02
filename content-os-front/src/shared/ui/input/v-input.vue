<script setup lang="ts">
import { computed, useAttrs, useId, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'

defineOptions({ inheritAttrs: false })

// Input of Figma "CMS / Shared / Field": label, box, error message.

const {
  label,
  error,
  class: className,
} = defineProps<{
  label?: string
  // Error message; a non-empty string switches the field to the error state.
  error?: string
  // Applied to the root wrapper. Other attributes (placeholder, type,
  // disabled, name, …) go to the <input>.
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string>()

const attrs = useAttrs()
const fallbackId = useId()
const id = computed(() => (attrs.id as string | undefined) ?? fallbackId)
const errorId = computed(() => `${id.value}-error`)
</script>

<template>
  <div :class="cn('flex w-full flex-col gap-2', className)">
    <label v-if="label" :for="id" class="text-p3 font-medium text-secondary">
      {{ label }}
    </label>

    <!-- The box carries border and background so prefix and suffix sit inside it. -->
    <div
      :class="[
        'flex h-11 items-center gap-2 rounded-[10px] px-3 transition-colors',
        'has-[input:disabled]:border-neutral-300 has-[input:disabled]:bg-neutral-200',
        error
          ? 'border-[1.5px] border-red-400 bg-red-100'
          : 'border border-default bg-card focus-within:border-violet-400',
      ]"
    >
      <slot name="prefix" />
      <input
        v-bind="attrs"
        :id="id"
        v-model="model"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? errorId : undefined"
        class="h-full w-full min-w-0 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-neutral-600 disabled:cursor-not-allowed disabled:text-secondary"
      />
      <slot name="suffix" />
    </div>

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
