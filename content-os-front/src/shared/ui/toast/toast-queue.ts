import { shallowReactive } from 'vue'

export type ToastTone = 'error' | 'success'

export interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  open: boolean
}

// More than this at once is noise; the oldest goes first.
const MAX_VISIBLE = 3
// Long enough for the close animation to finish before the item leaves the list.
const REMOVE_DELAY_MS = 200

let nextId = 0

export const toasts = shallowReactive<ToastItem[]>([])

function show(tone: ToastTone, title: string) {
  // Several requests failing together (going offline, say) make one toast, not five.
  if (toasts.some((item) => item.open && item.tone === tone && item.title === title)) return
  toasts.push({ id: nextId++, tone, title, open: true })
  const visible = toasts.filter((item) => item.open)
  if (visible.length > MAX_VISIBLE) dismiss(visible[0]!.id)
}

export function dismiss(id: number) {
  const index = toasts.findIndex((item) => item.id === id)
  if (index === -1) return
  toasts.splice(index, 1, { ...toasts[index]!, open: false })
  setTimeout(() => {
    const at = toasts.findIndex((item) => item.id === id)
    if (at !== -1) toasts.splice(at, 1)
  }, REMOVE_DELAY_MS)
}

export const toast = {
  error: (title: string) => show('error', title),
  success: (title: string) => show('success', title),
}
