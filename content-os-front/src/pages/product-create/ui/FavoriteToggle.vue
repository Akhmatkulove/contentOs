<script setup lang="ts">
import { useId } from 'vue'

// "Add to favorites": in the footer on desktop, at the end of the form on mobile.
const checked = defineModel<boolean>({ required: true })
const id = useId()
</script>

<template>
  <div class="flex items-center gap-2.5">
    <!-- TODO(ui): VToggle (Figma "CMS / Desktop / Toggle", "CMS / Mobile / Toggle"), 42×24. -->
    <input :id="id" v-model="checked" type="checkbox" class="size-5 shrink-0 accent-violet-400" />
    <label :for="id" class="flex flex-col gap-0.5">
      <span class="text-table font-semibold text-brand">Add to favorites</span>
      <span class="max-w-[165px] text-p4 font-medium text-secondary">
        Keep this reference in your favorites for easy access.
      </span>
    </label>
  </div>
</template>
