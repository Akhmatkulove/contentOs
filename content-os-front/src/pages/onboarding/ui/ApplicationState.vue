<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'
import type { IconName } from '@/shared/ui/icon'

const {
  icon,
  tone = 'violet',
  title,
  description,
  hideSupport = false,
} = defineProps<{
  icon: IconName
  tone?: 'violet' | 'mint' | 'yellow' | 'red'
  title: string
  // Line breaks (\n) are kept.
  description: string
  hideSupport?: boolean
}>()

const toneClasses = {
  violet: 'bg-violet-100 text-violet-400',
  mint: 'bg-mint-100 text-mint-400',
  yellow: 'bg-yellow-100 text-orange-400',
  red: 'bg-red-100 text-red-400',
}
</script>

<!-- Card for what happens to the application after the wizard: sending, sent, under review, approved. -->
<template>
  <div
    aria-live="polite"
    class="flex w-full flex-col items-center gap-4 rounded-[20px] bg-white px-5 py-7 text-center lg:w-[720px] lg:gap-7 lg:rounded-3xl lg:p-12"
  >
    <span
      :class="[
        'flex size-14 items-center justify-center rounded-full lg:size-20',
        toneClasses[tone],
      ]"
    >
      <VIcon :name="icon" class="size-[25.2px] lg:size-9" />
    </span>

    <div class="flex flex-col gap-2 lg:gap-3.5">
      <h1 class="text-[20px]/[1.1875] font-semibold text-violet-500 lg:text-[32px]">
        {{ title }}
      </h1>
      <p
        class="text-[12px]/[1.375] font-medium whitespace-pre-line text-neutral-600 lg:text-[16px]"
      >
        {{ description }}
      </p>
    </div>

    <slot name="details" />

    <div class="flex w-full flex-col gap-2.5 lg:w-80 lg:gap-3">
      <slot />
    </div>

    <a v-if="!hideSupport" href="#" class="text-[13px]/[19px] font-medium text-violet-400"
      >Need help? Contact support</a
    >
  </div>
</template>
