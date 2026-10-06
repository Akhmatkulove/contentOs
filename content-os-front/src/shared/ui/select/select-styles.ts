import { cn } from '@/shared/lib'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

// field: a form field (label above), filter: a 40px pill in list toolbars.
export type SelectVariant = 'field' | 'filter'

const triggerVariants: Record<SelectVariant, string> = {
  // Figma "Select / Interaction states". Radius follows the form fields
  // (VInput, VTextarea) so a select sits flush next to them.
  field: 'h-11 gap-2.5 rounded-[10px] px-3 text-p2',
  // Figma toolbar fields ("Field / All types" and the like).
  filter: 'h-10 gap-2 rounded-[20px] pr-3 pl-3.5 text-p3',
}

export function triggerClass(invalid: boolean, variant: SelectVariant = 'field') {
  return cn(
    'group flex w-full min-w-0 items-center border bg-card text-left font-medium text-brand transition-colors outline-none',
    triggerVariants[variant],
    'hover:bg-status-accent data-[state=open]:border-violet-400 data-[state=open]:bg-card',
    // Figma focus is a 2px border; an inset ring adds the second pixel without shifting content.
    'focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400 focus-visible:ring-inset',
    'disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary',
    invalid ? 'border-red-400' : 'border-default',
  )
}

export const chevronClass =
  'size-4 shrink-0 text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180'

// Figma "Dropdown / Open". `--available-height` is set by each primitive.
export const contentClass = cn(
  'z-50 flex max-h-[min(320px,var(--available-height))] flex-col overflow-hidden rounded-xl border border-default bg-card p-2 shadow-[0_8px_24px_rgb(33_20_59/0.13)]',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
)

// Same attributes on Reka SelectItem and ListboxItem.
export const itemClass = cn(
  'flex h-10 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-p2 font-medium text-brand outline-none select-none',
  'data-highlighted:bg-subtle data-[state=checked]:bg-status-accent data-[state=checked]:text-link',
  'data-disabled:cursor-not-allowed data-disabled:text-neutral-500',
)
