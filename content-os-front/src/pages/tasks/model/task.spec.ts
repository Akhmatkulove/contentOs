import type { TaskItem } from '../api/tasks'
import { showingLabel, taskAction, taskTabs, toTask } from './task'

const today = new Date(2024, 8, 18)

describe('taskAction', () => {
  it('asks the art director to review uploads and changes', () => {
    expect(taskAction('art_director', 'needs_review')).toBe('review')
    expect(taskAction('art_director', 'needs_changes')).toBe('review')
    expect(taskAction('art_director', 'to_shoot')).toBe('view')
    expect(taskAction('art_director', 'approved')).toBe('view')
  })

  it('only lets a creator view', () => {
    expect(taskAction('creator', 'needs_review')).toBe('view')
    expect(taskAction('creator', 'needs_changes')).toBe('view')
  })
})

describe('taskTabs', () => {
  const counts = {
    all: 14,
    to_shoot: 5,
    in_progress: 0,
    needs_review: 7,
    needs_changes: 2,
    approved: 5,
  }

  it('gives each role its own tabs', () => {
    expect(taskTabs('art_director', counts).map((tab) => `${tab.label} (${tab.count})`)).toEqual([
      'All (14)',
      'Needs review (7)',
      'Needs changes (2)',
      'To shoot (5)',
      'Approved (5)',
    ])
    expect(taskTabs('creator', counts).map((tab) => tab.value)).toEqual([
      'all',
      'to_shoot',
      'needs_changes',
      'approved',
    ])
  })

  it('shows zeros before the counts load', () => {
    expect(taskTabs('creator', undefined).every((tab) => tab.count === 0)).toBe(true)
  })
})

describe('toTask', () => {
  const item: TaskItem = {
    id: 't1',
    name: 'Walking transition',
    status: 'to_shoot',
    due_date: '2024-09-18',
    shoot: { id: 's1', name: 'Shoot 04', date: '2024-09-15' },
    product: { id: 'p1', name: 'Cream Dress 011', sku: null, photo: null },
    assignees: [],
    references: [],
    references_total: 5,
  }

  it('formats dates and counts the references left out', () => {
    const task = toTask(item, today)
    expect(task.dueDate).toBe('Sep 18, 2024')
    expect(task.due).toEqual({ label: 'Today', urgent: true })
    expect(task.shoot.date).toBe('Sep 15, 2024')
    expect(task.product).toEqual({ name: 'Cream Dress 011', sku: '', photoUrl: null })
    expect(task.moreReferences).toBe(5)
  })

  it('leaves the due date empty when not set', () => {
    const task = toTask({ ...item, due_date: null }, today)
    expect([task.dueDate, task.due]).toEqual(['', null])
  })
})

describe('showingLabel', () => {
  it('counts tasks', () => {
    expect(showingLabel(8, 14)).toBe('Showing 8 of 14 tasks')
    expect(showingLabel(1, 1)).toBe('Showing 1 of 1 task')
  })
})
