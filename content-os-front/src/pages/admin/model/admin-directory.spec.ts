import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'
import { assignLink, fetchAdminUsers, unassignLink, type AdminUsers } from '../api/admin'
import { useAdminDirectory } from './admin-directory'

vi.mock('@/shared/ui/modal', () => ({ openModal: vi.fn() }))
vi.mock('../api/admin', () => ({
  fetchAdminUsers: vi.fn(),
  assignLink: vi.fn(),
  unassignLink: vi.fn(),
}))

const user = (id: string, role: 'brand' | 'art_director' | 'creator') => ({
  id,
  email: `${id}@example.com`,
  name: null,
  role,
  status: 'approved' as const,
  photo_url: null,
  created_at: '2026-10-01T10:00:00Z',
})

const data: AdminUsers = {
  users: [
    user('ad', 'art_director'),
    user('creator', 'creator'),
    user('free', 'creator'),
    user('other', 'creator'),
  ],
  brand_art_directors: [],
  art_director_creators: [
    { art_director_id: 'ad', creator_id: 'creator', assigned_at: '2026-10-02T10:00:00Z' },
  ],
}

async function setup() {
  vi.mocked(fetchAdminUsers).mockResolvedValue(data)
  let api!: ReturnType<typeof useAdminDirectory>
  mount(
    defineComponent({
      setup() {
        api = useAdminDirectory()
        return () => null
      },
    }),
    { global: { plugins: [createPinia(), PiniaColada] } },
  )
  await flushPromises()
  api.tab.value = 'art_director'
  const entry = api.entries.value[0]!
  const creators = { kind: 'art-director-creator' as const, owner: true }
  return { api, entry, section: { ...creators, label: 'Creators', partners: entry.creators } }
}

beforeEach(() => vi.clearAllMocks())

describe('useAdminDirectory', () => {
  it('removes a link only after it is confirmed', async () => {
    const { api, entry, section } = await setup()
    const partner = entry.creators[0]!

    vi.mocked(openModal).mockResolvedValueOnce(undefined)
    await api.confirmRemove(entry, section, partner)
    expect(unassignLink).not.toHaveBeenCalled()

    vi.mocked(openModal).mockResolvedValueOnce(true as never)
    await api.confirmRemove(entry, section, partner)
    await flushPromises()
    expect(vi.mocked(unassignLink).mock.calls[0]![0]).toEqual({
      kind: 'art-director-creator',
      ownerId: 'ad',
      memberId: 'creator',
    })
  })

  it('assigns every picked user, offering only those not linked yet', async () => {
    const { api, entry, section } = await setup()

    vi.mocked(openModal).mockResolvedValueOnce(['free', 'other'] as never)
    await api.openAssign(entry, section)
    await flushPromises()

    const props = vi.mocked(openModal).mock.calls[0]![1] as { candidates: { id: string }[] }
    expect(props.candidates.map((c) => c.id)).toEqual(['free', 'other'])
    expect(vi.mocked(assignLink).mock.calls.map(([link]) => link)).toEqual([
      { kind: 'art-director-creator', ownerId: 'ad', memberId: 'free' },
      { kind: 'art-director-creator', ownerId: 'ad', memberId: 'other' },
    ])
  })

  it('changes nothing when the assign modal is cancelled', async () => {
    const { api, entry, section } = await setup()

    vi.mocked(openModal).mockResolvedValueOnce(undefined)
    await api.openAssign(entry, section)

    expect(assignLink).not.toHaveBeenCalled()
  })
})
