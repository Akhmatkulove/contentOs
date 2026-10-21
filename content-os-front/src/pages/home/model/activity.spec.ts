import type { ActivityItem } from '../api/home'
import { toActivityRow } from './activity'

const now = new Date('2024-09-18T12:00:00Z')
const amina = { id: 'u1', name: 'Amina', photo_url: null }
const lana = { id: 'u2', name: 'Lana', photo_url: 'l.jpg' }

function event(overrides: Partial<ActivityItem>): ActivityItem {
  return {
    id: 'e1',
    type: 'version_submitted',
    created_at: '2024-09-18T10:00:00Z',
    actor: lana,
    subject: null,
    shoot: { id: 's1', name: 'Shoot 04' },
    product: { id: 'p1', name: 'Dress' },
    deliverable: { id: 'd1', name: 'Close-up' },
    comment: null,
    count: 3,
    ...overrides,
  }
}

describe('toActivityRow', () => {
  it('says who did what to which deliverable, and opens its review', () => {
    expect(toActivityRow(event({}), 'u1', now)).toEqual({
      id: 'e1',
      title: 'Lana uploaded 3 files',
      detail: 'Close-up · Shoot 04',
      time: '2 h ago',
      actor: { name: 'Lana', photoUrl: 'l.jpg' },
      to: { name: 'task-review', params: { id: 'd1' } },
    })
  })

  it('names the product when the brand gets no shoot', () => {
    const row = toActivityRow(event({ type: 'content_sent', shoot: null }), 'u9', now)
    expect(row.detail).toBe('Close-up · Dress')
  })

  it('writes the user as You and names whose work was reviewed', () => {
    const approved = event({ type: 'version_approved', actor: amina, subject: lana })
    expect(toActivityRow(approved, 'u1', now).title).toBe("You approved Lana's work")
    const changes = event({ type: 'changes_requested', actor: amina, subject: lana })
    expect(toActivityRow(changes, 'u2', now).title).toBe('Amina requested changes from you')
  })

  it('quotes the comment and opens the content page', () => {
    const row = toActivityRow(
      event({ type: 'content_commented', actor: amina, comment: 'Looks great!' }),
      'u2',
      now,
    )
    expect([row.title, row.detail]).toEqual(['Amina left a comment', '“Looks great!”'])
    expect(row.to).toEqual({ name: 'content-item', params: { id: 'd1' } })
  })

  it('shows a completed shoot with the check tile instead of an avatar', () => {
    const row = toActivityRow(
      event({ type: 'shoot_completed', deliverable: null, product: null }),
      'u1',
      now,
    )
    expect([row.title, row.actor, row.to]).toEqual([
      'Shoot 04 marked as completed',
      null,
      { name: 'shoot', params: { id: 's1' } },
    ])
  })

  it('counts one file in the singular', () => {
    expect(toActivityRow(event({ type: 'content_approved', count: 1 }), 'u1', now).title).toBe(
      'Lana approved 1 file',
    )
  })
})
