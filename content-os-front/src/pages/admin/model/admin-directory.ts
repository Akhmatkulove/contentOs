import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, defineAsyncComponent, ref } from 'vue'
import { openModal } from '@/shared/ui/modal'
import type { SegmentedOption } from '@/shared/ui/segmented'
import { assignLink, fetchAdminUsers, unassignLink, type LinkRef } from '../api/admin'
import {
  assignCandidates,
  buildDirectory,
  displayName,
  linkRef,
  matchesSearch,
  MEMBER_NOUN,
  partnerNoun,
  type DirectoryEntry,
  type DirectoryTab,
  type LinkSection,
  type ManagedUser,
} from './directory'

// The modals' code loads on first open.
const AssignModal = defineAsyncComponent(() => import('../ui/AssignModal.vue'))
const ConfirmModal = defineAsyncComponent(() => import('../ui/ConfirmModal.vue'))

const USERS_KEY = ['admin', 'users']

const TAB_LABEL: Record<DirectoryTab, string> = {
  brand: 'Brands',
  art_director: 'Art directors',
  creator: 'Creators',
  none: 'No role',
}

// The admin panel: every user by role, who works with whom, and changing
// that. Every change is confirmed in a modal first.
export function useAdminDirectory() {
  const queryCache = useQueryCache()
  const { data, isLoading, error, refetch } = useQuery({
    key: USERS_KEY,
    query: fetchAdminUsers,
    meta: { toast: false },
  })

  const tab = ref<DirectoryTab>('brand')
  const search = ref('')

  const directory = computed(() => (data.value ? buildDirectory(data.value) : null))
  const tabOptions = computed<SegmentedOption<DirectoryTab>[]>(() =>
    (Object.keys(TAB_LABEL) as DirectoryTab[]).map((value) => ({
      value,
      label: `${TAB_LABEL[value]} · ${directory.value?.[value].length ?? 0}`,
    })),
  )
  const entries = computed(() =>
    (directory.value?.[tab.value] ?? []).filter((entry) => matchesSearch(entry.user, search.value)),
  )

  const refresh = () => queryCache.invalidateQueries({ key: USERS_KEY })
  // One request per pick: each is idempotent, so a retry after a partial
  // failure is safe, and the refreshed list shows what landed.
  const assign = useMutation({
    mutation: (links: LinkRef[]) => Promise.all(links.map(assignLink)),
    onSettled: refresh,
  })
  const unassign = useMutation({ mutation: unassignLink, onSettled: refresh })
  const saving = computed(() => assign.isLoading.value || unassign.isLoading.value)

  async function openAssign(entry: DirectoryEntry, section: LinkSection) {
    if (!directory.value) return
    const memberIds = await openModal(AssignModal, {
      owner: entry.user,
      noun: MEMBER_NOUN[section.kind],
      candidates: assignCandidates(directory.value, section),
    })
    if (!memberIds?.length) return
    assign.mutate(
      memberIds.map((memberId) => ({ kind: section.kind, ownerId: entry.user.id, memberId })),
    )
  }

  async function confirmRemove(entry: DirectoryEntry, section: LinkSection, partner: ManagedUser) {
    const confirmed = await openModal(ConfirmModal, {
      title: `Remove ${partnerNoun(section)}?`,
      description: section.owner
        ? `${displayName(partner)} will no longer work with ${displayName(entry.user)}.`
        : `${displayName(entry.user)} will no longer work with ${displayName(partner)}.`,
      confirmLabel: 'Remove',
    })
    if (confirmed) unassign.mutate(linkRef(section, entry.user, partner))
  }

  return {
    tab,
    tabOptions,
    search,
    entries,
    isLoading,
    failed: computed(() => !!error.value),
    retry: () => refetch(),
    saving,
    openAssign,
    confirmRemove,
  }
}
