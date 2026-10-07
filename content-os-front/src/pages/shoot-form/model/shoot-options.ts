import type { SelectOption } from '@/shared/ui/select'

// Options of the Shoot details selects.

// Minutes since midnight as a 24-hour time: 780 → "13:00", 570 → "09:30".
export function formatTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`
}

// Every half hour of a working day, 06:00–22:00; the value is the label.
export const startTimeOptions: SelectOption[] = Array.from({ length: 33 }, (_, index) => {
  const time = formatTime(6 * 60 + index * 30)
  return { value: time, label: time }
})

// "1 hour", "6 hours".
export function durationLabel(hours: number): string {
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

// 1–12 hours; the value is the number of hours.
export const durationOptions: SelectOption[] = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: durationLabel(index + 1),
}))

// TODO(api): the studios come from the backend.
export const locationOptions: SelectOption[] = [
  { value: 'tashkent-studio', label: 'Tashkent Studio' },
  { value: 'white-studio', label: 'White Studio' },
  { value: 'studio-a', label: 'Studio A' },
]

// "All sources" filter over the reference bank.
export const sourceFilterOptions: SelectOption[] = [
  { value: 'all', label: 'All sources' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'upload', label: 'Upload' },
]
