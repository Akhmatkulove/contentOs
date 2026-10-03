<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { Primitive } from 'reka-ui'
import { cn } from '@/shared/lib'

// Figma "CMS / Desktop / Button" and "CMS / Mobile / Button".
// Clicked = :active. hover: only fires with a mouse or trackpad (see
// tailwind.css), which matches the mobile set having no Hover state. pointer-events-none on
// disabled keeps hover/active from repainting a disabled button.
const buttonVariants = cva(
  'inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-action-accent text-inverse hover:bg-inverse active:bg-violet-300 disabled:bg-violet-200',
        secondary:
          'border border-default bg-card text-link hover:bg-status-accent active:border-violet-400 active:bg-status-accent disabled:bg-subtle disabled:text-tertiary',
        // inset-ring instead of a border: the pressed outline must not shift the content.
        soft: 'bg-status-accent text-link hover:bg-violet-200 active:bg-violet-200 active:inset-ring active:inset-ring-violet-400 disabled:bg-subtle disabled:text-tertiary',
        // White surface without a border: actions over photos, notifications.
        surface: 'bg-card text-primary',
        // No surface until pressed: view toggles (aria-pressed).
        ghost: 'text-secondary aria-pressed:bg-status-accent aria-pressed:text-link',
      },
      // The number is the height in px. Icons inside a text button take the
      // size's icon size, so callers don't pass one.
      size: {
        '28': 'h-7 px-3 text-p3 font-medium',
        '34': 'h-8.5 gap-1.5 px-2.5 text-p3 font-medium [&>svg]:size-4',
        // Padding and type differ per variant in Figma: see compoundVariants.
        '36': 'h-9',
        '40': 'h-10 gap-2 px-3 text-p2 font-semibold has-[>svg]:pr-4.5 has-[>svg]:pl-4 [&>svg]:size-4',
        '44': 'h-11 gap-2 px-6 text-p1 font-semibold [&>svg]:size-4.5',
        // Icon-only, square; the icon size is up to the caller.
        'icon-24': 'size-6',
        'icon-32': 'size-8',
        'icon-36': 'size-9',
        'icon-40': 'size-10',
        'icon-44': 'size-11',
      },
    },
    compoundVariants: [
      {
        variant: 'primary',
        size: '36',
        class: 'gap-1.5 px-3 text-table font-semibold [&>svg]:size-4',
      },
      {
        variant: 'secondary',
        size: '36',
        class: 'gap-2 px-3.5 text-p2 font-semibold [&>svg]:size-3.5',
      },
      { variant: 'soft', size: '36', class: 'gap-1.5 px-3 text-p3 font-medium [&>svg]:size-3.5' },
    ],
    defaultVariants: { variant: 'primary', size: '40' },
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

// Cached until a prop changes, so slot updates don't recompute it.
// tailwind-merge only runs when the caller passes classes to merge.
const classes = computed(() => {
  const base = buttonVariants({ variant, size })
  return className ? cn(base, className) : base
})
</script>

<template>
  <Primitive as="button" :as-child="asChild" :type="asChild ? undefined : type" :class="classes">
    <slot />
  </Primitive>
</template>
