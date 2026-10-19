import { useMutation, useQueryCache } from '@pinia/colada'
import { computed, defineAsyncComponent, ref } from 'vue'
import { shootKeys, type ShootDetails } from '@/entities/shoot'
import { openModal } from '@/shared/ui/modal'
import { toast } from '@/shared/ui/toast'
import { setResponsibilities, type ResponsibilitiesBody } from '../api/responsibilities'
import { noteLines } from './notes'
import { ALL, matches, shootPeople, type ShootPerson, type ShootRoleLabel } from './shoot'

// What each role on a shoot does: Figma "Role responsibilities".
export const roleResponsibilities: Record<ShootRoleLabel, string[]> = {
  'Art Director': [
    'Set creative vision and style direction',
    'Approve shot list, content and final edits',
    'Ensure brand consistency across outputs',
  ],
  Mobilographer: [
    'Capture high-quality photo and video',
    'Manage and maintain camera equipment',
    'Organize, label and back up all files',
  ],
  Creator: [
    'Model for product and lifestyle shots',
    'Create engaging short-form video content',
    'Collaborate on team creative ideas',
  ],
}

// The art director's member card: the same on every shoot.
const artDirectorResponsibilities = [
  'Creative direction',
  'Shot list & moodboard approval',
  'Final review and sign-off',
]

export interface TeamCard extends ShootPerson {
  // Deliverables the member is an assignee of; the art director's line counts
  // every deliverable of the shoot instead (they oversee all of them).
  tasks: number
  responsibilities: string[]
  // Creators and mobilographers: the text behind `responsibilities`, set per
  // shoot by its author ('' — not yet). Null for the art director (fixed list).
  responsibilitiesText: string | null
}

export function teamCards(shoot: ShootDetails): TeamCard[] {
  return shootPeople(shoot).map((person) => {
    const text =
      person.role === 'Art Director' ? null : (shoot.responsibilities[person.member.id] ?? '')
    return {
      ...person,
      tasks:
        person.role === 'Art Director'
          ? shoot.deliverables.length
          : shoot.deliverables.filter((d) => d.assignees.some((a) => a.id === person.member.id))
              .length,
      responsibilities: text === null ? artDirectorResponsibilities : noteLines(text),
      responsibilitiesText: text,
    }
  })
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
    mobilographers: shoot.mobilographers.length,
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

// The modal's code loads on first open.
const ResponsibilitiesModal = defineAsyncComponent(() => import('../ui/ResponsibilitiesModal.vue'))

// The Team tab: the member cards, their search and role filter, the summary and
// Add / Edit responsibilities (the shoot's author).
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

  const queryCache = useQueryCache()
  const { mutate: save } = useMutation({
    mutation: (vars: { shootId: string; userId: string; body: ResponsibilitiesBody }) =>
      setResponsibilities(vars.shootId, vars.userId, vars.body),
    onSuccess: (saved) => {
      queryCache.setQueryData(shootKeys.detail(saved.id), saved)
      toast.success('Responsibilities saved')
    },
  })

  // Unchanged text isn't sent; a failed save shows the global error toast.
  async function editResponsibilities(card: TeamCard) {
    const shootId = shoot()?.id
    if (!shootId || card.responsibilitiesText === null) return
    const body = await openModal(ResponsibilitiesModal, {
      name: card.member.name || 'this member',
      text: card.responsibilitiesText,
    })
    if (body && body.responsibilities !== card.responsibilitiesText) {
      save({ shootId, userId: card.member.id, body })
    }
  }

  return { search, role, cards, found, summary, editResponsibilities }
}
