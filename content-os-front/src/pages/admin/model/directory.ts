import type { Schemas } from '@/shared/api'
import type { AdminUsers, LinkKind, LinkRef } from '../api/admin'

export type ManagedUser = Schemas['ManagedUser']
type Role = NonNullable<ManagedUser['role']>
type Status = ManagedUser['status']

// Users without a role are still choosing one on onboarding.
export type DirectoryTab = Role | 'none'

export interface DirectoryEntry {
  user: ManagedUser
  // Linked users by their role; only the lists that fit the user's role fill up.
  brands: ManagedUser[]
  artDirectors: ManagedUser[]
  creators: ManagedUser[]
}

export type Directory = Record<DirectoryTab, DirectoryEntry[]>

export function tabOf(user: ManagedUser): DirectoryTab {
  return user.role ?? 'none'
}

const LIST_OF: Record<Role, 'brands' | 'artDirectors' | 'creators'> = {
  brand: 'brands',
  art_director: 'artDirectors',
  creator: 'creators',
}

// Users by tab, in the order the backend sent them (newest first), each with
// the users it is linked to.
export function buildDirectory({
  users,
  brand_art_directors,
  art_director_creators,
}: AdminUsers): Directory {
  const entries = new Map<string, DirectoryEntry>(
    users.map((user) => [user.id, { user, brands: [], artDirectors: [], creators: [] }]),
  )
  const link = (aId: string, bId: string) => {
    const a = entries.get(aId)
    const b = entries.get(bId)
    if (!a || !b || !a.user.role || !b.user.role) return
    a[LIST_OF[b.user.role]].push(b.user)
    b[LIST_OF[a.user.role]].push(a.user)
  }
  for (const l of brand_art_directors) link(l.brand_id, l.art_director_id)
  for (const l of art_director_creators) link(l.art_director_id, l.creator_id)

  const directory: Directory = { brand: [], art_director: [], creator: [], none: [] }
  for (const entry of entries.values()) directory[tabOf(entry.user)].push(entry)
  return directory
}

// One block of linked users on a card. Links are assigned from the owner's
// side (a brand gets art directors, an art director gets creators) and can
// be removed from either side.
export interface LinkSection {
  kind: LinkKind
  label: string
  partners: ManagedUser[]
  // The card's user owns the link: then the section can assign more.
  owner: boolean
}

export function sectionsOf(entry: DirectoryEntry): LinkSection[] {
  switch (entry.user.role) {
    case 'brand':
      return [
        {
          kind: 'brand-art-director',
          label: 'Art directors',
          partners: entry.artDirectors,
          owner: true,
        },
      ]
    case 'art_director':
      return [
        { kind: 'brand-art-director', label: 'Brands', partners: entry.brands, owner: false },
        { kind: 'art-director-creator', label: 'Creators', partners: entry.creators, owner: true },
      ]
    case 'creator':
      return [
        {
          kind: 'art-director-creator',
          label: 'Art directors',
          partners: entry.artDirectors,
          owner: false,
        },
      ]
    default:
      return []
  }
}

export function linkRef(section: LinkSection, user: ManagedUser, partner: ManagedUser): LinkRef {
  return section.owner
    ? { kind: section.kind, ownerId: user.id, memberId: partner.id }
    : { kind: section.kind, ownerId: partner.id, memberId: user.id }
}

// The backend links only approved users.
export function canAssign(section: LinkSection, user: ManagedUser): boolean {
  return section.owner && user.status === 'approved'
}

export const MEMBER_NOUN: Record<LinkKind, string> = {
  'brand-art-director': 'art director',
  'art-director-creator': 'creator',
}

// What the partner on a card is: the member seen from the owner's side,
// the owner seen from the member's side.
export function partnerNoun(section: LinkSection): string {
  if (section.owner) return MEMBER_NOUN[section.kind]
  return section.kind === 'brand-art-director' ? 'brand' : 'art director'
}

const MEMBER_TAB: Record<LinkKind, Role> = {
  'brand-art-director': 'art_director',
  'art-director-creator': 'creator',
}

// Approved users of the member role not yet linked to this owner.
export function assignCandidates(directory: Directory, section: LinkSection): ManagedUser[] {
  const taken = new Set(section.partners.map((user) => user.id))
  return directory[MEMBER_TAB[section.kind]]
    .map((entry) => entry.user)
    .filter((user) => user.status === 'approved' && !taken.has(user.id))
}

export function matchesSearch(user: ManagedUser, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [user.name, user.email].some((field) => field?.toLowerCase().includes(needle))
}

export function displayName(user: ManagedUser): string {
  return user.name || user.email
}

export const STATUS_LABEL: Record<Status, string> = {
  onboarding: 'Onboarding',
  pending_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const STATUS_TONE = {
  onboarding: 'accent',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'danger',
} as const satisfies Record<Status, string>
