<script setup lang="ts">
import { computed, useAttrs, useId, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'

defineOptions({ inheritAttrs: false })

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
    <label v-if="label" :for="id" class="text-p3 font-medium text-neutral-600">
      {{ label }}
    </label>

    <!-- The box carries border and background so the suffix sits inside it. -->
    <div
      :class="[
        'flex h-10 items-center gap-2 rounded-xl border px-3 transition-colors',
        'has-[input:disabled]:border-neutral-300 has-[input:disabled]:bg-neutral-200',
        error
          ? 'border-red-400 bg-red-100'
          : 'border-neutral-300 bg-white focus-within:border-violet-400',
      ]"
    >
      <input
        v-bind="attrs"
        :id="id"
        v-model="model"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? errorId : undefined"
        class="h-full w-full min-w-0 flex-1 bg-transparent text-p1 font-medium text-violet-500 outline-none placeholder:text-neutral-600 disabled:cursor-not-allowed disabled:text-neutral-600"
      />
      <slot name="suffix" />
    </div>

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
