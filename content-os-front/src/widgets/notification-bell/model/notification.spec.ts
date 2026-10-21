import type { NotificationItem } from '../api/notifications'
import { toNotification } from './notification'

const now = new Date('2024-09-18T12:00:00Z')

describe('toNotification', () => {
  const item: NotificationItem = {
    id: 'n1',
    type: 'deliverables_assigned',
    created_at: '2024-09-18T11:55:00Z',
    read: false,
    actor: { id: 'b1', name: 'Acme', photo_url: null },
    product: { id: 'p1', name: 'Black Abaya', photo: null },
    deliverable: null,
    count: 3,
  }

  it('says who assigned how many deliverables, and opens that product in the backlog', () => {
    expect(toNotification(item, now)).toEqual({
      id: 'n1',
      text: 'Acme assigned you 3 deliverables in Black Abaya',
      time: '5 min ago',
      read: false,
      photoUrl: null,
      to: { name: 'tasks', query: { view: 'brand', product: 'p1' } },
    })
  })

  it('speaks of one deliverable and of a deleted brand account', () => {
    expect(toNotification({ ...item, count: 1, actor: null }, now).text).toBe(
      'A brand assigned you 1 deliverable in Black Abaya',
    )
  })
})

describe('toNotification: content sent', () => {
  const item: NotificationItem = {
    id: 'n2',
    type: 'content_sent',
    created_at: '2024-09-18T11:55:00Z',
    read: true,
    actor: { id: 'a1', name: 'Amina', photo_url: null },
    product: { id: 'p1', name: 'Black Abaya', photo: null },
    deliverable: { id: 'd1', name: 'Close-up' },
    count: 3,
  }

  it('tells the brand the order is ready and opens its content page', () => {
    expect(toNotification(item, now)).toEqual({
      id: 'n2',
      text: 'Your order is ready: Close-up for Black Abaya (3 files)',
      time: '5 min ago',
      read: true,
      photoUrl: null,
      to: { name: 'content-item', params: { id: 'd1' } },
    })
    expect(toNotification({ ...item, deliverable: null }, now).to).toEqual({
      name: 'content',
      query: { product: 'p1' },
    })
  })

  it('speaks of one file', () => {
    expect(toNotification({ ...item, count: 1, product: null }, now).text).toBe(
      'Your order is ready: Close-up (1 file)',
    )
    expect(toNotification({ ...item, deliverable: null }, now).text).toBe(
      'Your order is ready: Black Abaya (3 files)',
    )
  })
})

describe('toNotification: comments and approval', () => {
  const item: NotificationItem = {
    id: 'n3',
    type: 'content_commented',
    created_at: '2024-09-18T11:55:00Z',
    read: false,
    actor: { id: 'b1', name: 'Acme', photo_url: null },
    product: { id: 'p1', name: 'Black Abaya', photo: null },
    deliverable: { id: 'd1', name: 'Close-up' },
    count: 1,
  }

  it('names the commenter, or counts the unread comments, and opens the content page', () => {
    const one = toNotification(item, now)
    expect(one.text).toBe('Acme commented on Close-up for Black Abaya')
    expect(one.to).toEqual({ name: 'content-item', params: { id: 'd1' } })
    expect(toNotification({ ...item, count: 3 }, now).text).toBe(
      '3 new comments on Close-up for Black Abaya',
    )
  })

  it('says the brand approved the content', () => {
    expect(toNotification({ ...item, type: 'content_approved', count: 2 }, now).text).toBe(
      'Acme approved Close-up for Black Abaya',
    )
  })
})
