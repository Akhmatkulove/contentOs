import { computed, ref } from 'vue'
import type { ShootDetails } from '@/entities/shoot'
import { ALL, matches, shootPeople, type ShootPerson, type ShootRoleLabel } from './shoot'

// What each role on a shoot does: Figma "Role responsibilities" and the lists
// on the member cards. Static: the shoot has no per-person responsibilities yet.
export const roleResponsibilities: Record<ShootRoleLabel, { card: string[]; member: string[] }> = {
  'Art Director': {
    card: [
      'Set creative vision and style direction',
      'Approve shot list, content and final edits',
      'Ensure brand consistency across outputs',
    ],
    member: ['Creative direction', 'Shot list & moodboard approval', 'Final review and sign-off'],
  },
  Mobilographer: {
    card: [
      'Capture high-quality photo and video',
      'Manage and maintain camera equipment',
      'Organize, label and back up all files',
    ],
    member: [
      'Capture photo & video content',
      'Manage camera equipment',
      'Organize and back up files',
    ],
  },
  Creator: {
    card: [
      'Model for product and lifestyle shots',
      'Create engaging short-form video content',
      'Collaborate on team creative ideas',
    ],
    member: [
      'Model for product shots',
      'Create short-form video content',
      'Collaborate on creative ideas',
    ],
  },
}

export interface TeamCard extends ShootPerson {
  // Deliverables the member is an assignee of; the art director's line counts
  // every deliverable of the shoot instead (they oversee all of them).
  tasks: number
  responsibilities: string[]
}

export function teamCards(shoot: ShootDetails): TeamCard[] {
  return shootPeople(shoot).map((person) => ({
    ...person,
    tasks:
      person.role === 'Art Director'
        ? shoot.deliverables.length
        : shoot.deliverables.filter((d) => d.assignees.some((a) => a.id === person.member.id))
            .length,
    responsibilities: roleResponsibilities[person.role].member,
  }))
}

// "5 tasks assigned"; the art director's line reads "Oversees 5 deliverables".
export function tasksLabel(card: TeamCard): string {
  if (card.role === 'Art Director') {
    return `Oversees ${card.tasks} ${card.tasks === 1 ? 'deliverable' : 'deliverables'}`
  }
  return `${card.tasks} ${card.tasks === 1 ? 'task' : 'tasks'} assigned`
}

// Figma "Team summary".
export function teamSummary(shoot: ShootDetails) {
  return {
    members: shootPeople(shoot).length,
    creators: shoot.creators.length,
    // Deliverables someone is assigned to.
    tasks: shoot.deliverables.filter((deliverable) => deliverable.assignees.length).length,
    mobilographers: shoot.mobilographer ? 1 : 0,
  }
}

export const teamRoleOptions = [
  { value: ALL, label: 'All roles' },
  { value: 'Art Director', label: 'Art Director' },
  { value: 'Creator', label: 'Creator' },
  { value: 'Mobilographer', label: 'Mobilographer' },
] as const

// The Team tab: search by name, role and responsibility, filter by role.
export function findTeam(cards: TeamCard[], search: string, role: string): TeamCard[] {
  return cards.filter(
    (card) =>
      (role === ALL || card.role === role) &&
      matches([card.member.name ?? '', card.role, ...card.responsibilities].join(' '), search),
  )
}

// The Team tab: the member cards, their search and role filter, and the summary.
export function useTeamTab(shoot: () => ShootDetails | undefined) {
  const search = ref('')
  const role = ref<string>(ALL)
  const cards = computed(() => {
    const value = shoot()
    return value ? teamCards(value) : []
  })
  const found = computed(() => findTeam(cards.value, search.value, role.value))
  const summary = computed(() => {
    const value = shoot()
    return value ? teamSummary(value) : { members: 0, creators: 0, tasks: 0, mobilographers: 0 }
  })
  return { search, role, cards, found, summary }
}
