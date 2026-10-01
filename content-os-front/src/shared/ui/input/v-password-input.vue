<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue'
import { VIcon } from '@/shared/ui/icon'
import VInput from './v-input.vue'

// Other attributes (placeholder, name, autocomplete, …) fall through to VInput.
const {
  label,
  error,
  class: className,
} = defineProps<{
  label?: string
  error?: string
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string>()

const visible = ref(false)
</script>

<template>
  <VInput
    v-model="model"
    :label="label"
    :error="error"
    :class="className"
    :type="visible ? 'text' : 'password'"
  >
    <template #suffix>
      <button
        type="button"
        aria-label="Show password"
        :aria-pressed="visible"
        class="flex shrink-0 rounded-sm text-neutral-600 outline-none focus-visible:outline-2 focus-visible:outline-violet-400"
        @click="visible = !visible"
      >
        <VIcon name="eye" :size="18" />
      </button>
    </template>
  </VInput>
</template>
