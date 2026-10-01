import type { IconName } from '@/shared/ui/icon'
import type { Role } from './draft'

export const roleOptions: { value: Role; icon: IconName; title: string; description: string }[] = [
  {
    value: 'creator',
    icon: 'user',
    title: 'Creator / Mobilograph',
    description: 'Create and upload content\nfor brands',
  },
  {
    value: 'manager',
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
