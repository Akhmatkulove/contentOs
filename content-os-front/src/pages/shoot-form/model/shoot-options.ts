import { durationLabel } from '@/entities/shoot'
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

// Every half hour from 30 min to 12 h; the value is the length in minutes.
export const durationOptions: SelectOption[] = Array.from({ length: 24 }, (_, index) => {
  const minutes = (index + 1) * 30
  return { value: String(minutes), label: durationLabel(minutes) }
})
