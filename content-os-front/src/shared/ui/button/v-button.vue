<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { Primitive } from 'reka-ui'
import { cn } from '@/shared/lib'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-action-accent text-inverse',
        // White surface with a hairline: filter trigger, pagination.
        outline: 'border border-default bg-card text-primary disabled:text-neutral-500',
        // White surface without a border: actions over photos, notifications.
        surface: 'bg-card text-primary',
        // No surface until pressed: view toggles (aria-pressed).
        ghost: 'text-secondary aria-pressed:bg-status-accent aria-pressed:text-link',
      },
      size: {
        md: 'h-10 gap-1.5 px-5 text-p2 font-semibold',
        // Icon-only, square; the number is the side in px.
        'icon-24': 'size-6',
        'icon-32': 'size-8',
        'icon-36': 'size-9',
        'icon-40': 'size-10',
        'icon-44': 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonVariants = VariantProps<typeof buttonVariants>

const {
  variant,
  size,
  type = 'button',
  asChild = false,
  class: className,
} = defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  type?: 'button' | 'submit' | 'reset'
  // Render the single child (e.g. a RouterLink) with the button's look
  // instead of a <button>.
  asChild?: boolean
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Primitive
    as="button"
    :as-child="asChild"
    :type="asChild ? undefined : type"
    :class="cn(buttonVariants({ variant, size }), className)"
  >
    <slot />
  </Primitive>
</template>
