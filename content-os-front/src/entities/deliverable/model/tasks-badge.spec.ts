import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, type ComputedRef } from 'vue'
import { http } from '@/shared/api'
import { attentionStatus, useTasksBadge } from './tasks-badge'

describe('attentionStatus', () => {
  it('counts what waits for the user: changes for a creator, review for an art director', () => {
    expect(attentionStatus('creator')).toBe('needs_changes')
    expect(attentionStatus('art_director')).toBe('needs_review')
    expect(attentionStatus('brand')).toBeNull()
    expect(attentionStatus(undefined)).toBeNull()
  })
})

describe('useTasksBadge', () => {
  afterEach(() => vi.restoreAllMocks())

  async function badge(
    role: 'art_director' | 'creator',
    status: 'approved' | 'pending_review' = 'approved',
  ) {
    const get = vi.spyOn(http, 'get').mockImplementation(async (url: string) => ({
      data: {
        items: [],
        total: 0,
        counts:
          url === '/tasks/brand-deliverables'
            ? { not_scheduled: 3 }
            : { needs_review: 2, needs_changes: 5 },
      },
    }))
    let count: ComputedRef<number> | undefined
    mount(
      defineComponent({
        setup() {
          count = useTasksBadge(() => ({ id: 'u1', role, status }))
          return () => null
        },
      }),
      { global: { plugins: [createPinia(), PiniaColada] } },
    )
    await flushPromises()
    return { count: count!.value, get }
  }

  it("adds the art director's not scheduled brand deliverables to the reviews", async () => {
    expect((await badge('art_director')).count).toBe(5)
  })

  it('asks nothing for an art director who is not approved yet', async () => {
    const { count, get } = await badge('art_director', 'pending_review')
    expect(count).toBe(0)
    expect(get).not.toHaveBeenCalled()
  })

  it("counts a creator's requested changes only", async () => {
    const { count, get } = await badge('creator')
    expect(count).toBe(5)
    expect(get).not.toHaveBeenCalledWith('/tasks/brand-deliverables', expect.anything())
  })
})
