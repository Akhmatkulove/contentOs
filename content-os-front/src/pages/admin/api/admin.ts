import { http, type Schemas } from '@/shared/api'

export type AdminUsers = Schemas['AdminUsersResponse']

// Who works with whom: a brand with its art directors, an art director with
// their creators. The owner is the first of the pair.
export type LinkKind = 'brand-art-director' | 'art-director-creator'

export interface LinkRef {
  kind: LinkKind
  ownerId: string
  memberId: string
}

const linkUrl = ({ kind, ownerId, memberId }: LinkRef) =>
  kind === 'brand-art-director'
    ? `/admin/brands/${ownerId}/art-directors/${memberId}`
    : `/admin/art-directors/${ownerId}/creators/${memberId}`

export async function fetchAdminUsers(): Promise<AdminUsers> {
  return (await http.get<AdminUsers>('/admin/users')).data
}

// Both calls are idempotent: repeating one changes nothing.
export async function assignLink(link: LinkRef): Promise<void> {
  await http.put(linkUrl(link))
}

export async function unassignLink(link: LinkRef): Promise<void> {
  await http.delete(linkUrl(link))
}
