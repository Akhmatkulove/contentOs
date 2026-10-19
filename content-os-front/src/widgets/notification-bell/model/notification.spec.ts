import type { NotificationItem } from '../api/notifications'
import { timeAgo, toNotification } from './notification'

const now = new Date('2024-09-18T12:00:00Z')

describe('timeAgo', () => {
  it('counts minutes and hours, then names the day', () => {
    expect(timeAgo('2024-09-18T11:59:30Z', now)).toBe('Just now')
    expect(timeAgo('2024-09-18T11:55:00Z', now)).toBe('5 min ago')
    expect(timeAgo('2024-09-18T09:00:00Z', now)).toBe('3 h ago')
    expect(timeAgo('2024-09-17T09:00:00Z', now)).toBe('Yesterday')
    expect(timeAgo('2024-09-10T09:00:00Z', now)).toBe('Sep 10')
  })
})

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

  it('tells the brand the order is ready and opens its content', () => {
    expect(toNotification(item, now)).toEqual({
      id: 'n2',
      text: 'Your order is ready: Close-up for Black Abaya (3 files)',
      time: '5 min ago',
      read: true,
      photoUrl: null,
      to: { name: 'content', query: { product: 'p1' } },
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
