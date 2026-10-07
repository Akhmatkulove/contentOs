import type { SelectOption } from '@/shared/ui/select'

// Options of the Shoot details selects.

// "10:00" → "10:00 AM", "13:30" → "1:30 PM".
export function formatStartTime(value: string): string {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  const period = hours < 12 ? 'AM' : 'PM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`
}

// Every half hour of a working day, 6:00 AM–10:00 PM; the value is "HH:MM".
export const startTimeOptions: SelectOption[] = Array.from({ length: 33 }, (_, index) => {
  const minutes = 6 * 60 + index * 30
  const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return { value, label: formatStartTime(value) }
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
