import type { Role } from '@/entities/session'
import type { IconName } from '@/shared/ui/icon'

export const roleOptions: { value: Role; icon: IconName; title: string; description: string }[] = [
  {
    value: 'creator',
    icon: 'user',
    title: 'Creator / Mobilograph',
    description: 'Create and upload content\nfor brands',
  },
  {
    value: 'art_director',
    icon: 'user-group',
    title: 'Manager / Art Director',
    description: 'Plan, review and manage\ncontent',
  },
  {
    value: 'brand',
    icon: 'folder-01',
    title: 'Brand',
    description: 'Work with creators\nand manage campaigns',
  },
]

export function roleTitle(role: Role | null | undefined) {
  return roleOptions.find((option) => option.value === role)?.title
}
