<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib'

// Figma "CMS / Products / Status". Figma has a variant per status; here a
// variant per colour, and each page maps its statuses to a tone and a label.
const statusVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        // Approved, Active, Completed, Saved, Linked
        success: 'bg-mint-100 text-mint-400',
        // In progress, Planned, To shoot, On set, Available, Not uploaded yet
        info: 'bg-status-info text-status-info',
        // Needs review
        warning: 'bg-status-warning text-orange-400',
        // Needs changes
        danger: 'bg-red-100 text-red-400',
        // Upcoming, Creator
        accent: 'bg-status-accent text-link',
      },
      // Height in px, as in Figma.
      size: {
        26: 'h-[26px] gap-1.5 px-2.5 text-p3',
        24: 'h-6 gap-1 px-3 text-p4',
        20: 'h-5 gap-1 px-3 text-p4',
      },
    },
    defaultVariants: { tone: 'info', size: 26 },
  },
)

type StatusVariants = VariantProps<typeof statusVariants>

const {
  tone,
  size,
  class: className,
} = defineProps<{
  tone?: StatusVariants['tone']
  size?: StatusVariants['size']
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span :class="cn(statusVariants({ tone, size }), className)">
    <span
      :class="['shrink-0 rounded-full bg-current', size === 26 || !size ? 'size-[5px]' : 'size-1']"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
