import type { IconName } from '@/shared/ui/icon'

export interface SegmentedOption<V extends string = string> {
  value: V
  label: string
  icon?: IconName
  disabled?: boolean
}
