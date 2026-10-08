import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'
import { useSessionStore } from '@/entities/session'
import { fetchCreators } from '../api/team'
import type { TeamMember } from './shoot-draft'

// The members with these ids, in the order they were picked.
export function membersByIds(pool: TeamMember[], ids: string[]): TeamMember[] {
  return ids.flatMap((id) => pool.find((member) => member.id === id) ?? [])
}

// Who is left to pick: one person has one job on a shoot.
export function pickable(pool: TeamMember[], taken: string[]): TeamMember[] {
  return pool.filter((member) => !taken.includes(member.id))
}

// The shoot's team. The art director is whoever creates the shoot; creators
// (any number) and the mobilographer (at most one) come from the art director's
// own creators.
export function useShootTeam() {
  const session = useSessionStore()

  const artDirector = computed<TeamMember | null>(() => {
    const me = session.me
    return me ? { id: me.id, name: me.name, photo_url: me.photo_url } : null
  })

  const { data, isLoading } = useQuery({ key: ['team', 'creators'], query: fetchCreators })
  const pool = computed(() => data.value ?? [])

  const creatorIds = ref<string[]>([])
  const mobilographerId = ref<string>()

  const creators = computed(() => membersByIds(pool.value, creatorIds.value))
  const mobilographer = computed(
    () => membersByIds(pool.value, mobilographerId.value ? [mobilographerId.value] : [])[0] ?? null,
  )

  const creatorOptions = computed(() =>
    pickable(pool.value, mobilographerId.value ? [mobilographerId.value] : []),
  )
  const mobilographerOptions = computed(() => pickable(pool.value, creatorIds.value))

  // Who can be assigned to the shoot's deliverables.
  const members = computed(() =>
    mobilographer.value ? [...creators.value, mobilographer.value] : creators.value,
  )

  return {
    artDirector,
    members,
    loading: isLoading,
    creatorIds,
    creators,
    creatorOptions,
    mobilographerId,
    mobilographer,
    mobilographerOptions,
  }
}
