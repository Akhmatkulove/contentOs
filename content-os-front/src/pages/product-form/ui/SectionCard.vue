<script setup lang="ts">
// Form section: title, optional hint and action. On mobile the action goes
// under the title at full width, on desktop to the right of it.
const {
  title,
  description,
  required = false,
} = defineProps<{
  title: string
  description?: string
  // Marks the title with an asterisk: the section must not stay empty.
  required?: boolean
}>()
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_16px_rgb(29_42_60/0.05)] md:gap-4 md:p-5 md:shadow-none"
  >
    <div class="flex flex-col gap-6 md:flex-row md:items-center md:gap-2.5">
      <div class="flex min-w-0 flex-1 flex-col gap-1 md:gap-2">
        <h2 class="text-h6 text-brand">
          {{ title }}<span v-if="required" aria-hidden="true" class="text-red-400"> *</span>
        </h2>
        <p v-if="description" class="text-p3 font-medium text-secondary">{{ description }}</p>
      </div>
      <slot name="action" />
    </div>
    <slot />
  </section>
</template>
