import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Font sizes from `--text-*` in tailwind.css. Without them tailwind-merge
// treats `text-p3` as a text color and drops it next to `text-neutral-700`.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['h3', 'h4', 'h6', 'p1', 'p2', 'p3', 'p4', 'table'] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
