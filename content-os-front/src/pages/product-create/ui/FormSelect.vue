<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'

// The Select state of Figma "CMS / Shared / Field" (next to VInput and
// VTextarea), as a static trigger.
// TODO(ui): VSelect (dropdown) — replace this trigger; tags need multi-select.
const { label, placeholder, value } = defineProps<{
  label: string
  placeholder: string
  value?: string
}>()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <span class="text-p3 font-medium text-secondary">{{ label }}</span>
    <button
      type="button"
      :aria-label="label"
      class="flex h-11 w-full items-center gap-2 rounded-[10px] border border-default bg-card px-3 text-left text-p2 font-medium"
    >
      <span :class="['min-w-0 flex-1 truncate', value ? 'text-brand' : 'text-neutral-600']">
        {{ value || placeholder }}
      </span>
      <VIcon name="arrow-down-01-sharp" :size="16" class="text-secondary" />
    </button>
  </div>
</template>
