import { describe, expect, it } from 'vitest'
import type { Schemas } from '@/shared/api'
import { referenceCards } from './task-references'

function reference(id: string) {
  return {
    id,
    title: `Ref ${id}`,
    type: null,
    link: null,
    collection: null,
    notes: null,
    tags: [],
    product_id: null,
    author_id: 'u1',
    author: 'Amina',
    files: [],
    favorite: false,
    created_at: '2026-10-06T10:00:00Z',
  } satisfies Schemas['ReferenceResponse']
}

const ids = (cards: ReturnType<typeof referenceCards>) => cards.references.map((card) => card.id)

describe('referenceCards', () => {
  const task = { references: ['r1', 'r2', 'r3', 'r4', 'r5'].map(reference), references_total: 8 }

  it('shows the first references and how many are left', () => {
    const cards = referenceCards(task, undefined)
    expect(ids(cards)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5'])
    expect(cards.more).toBe(3)
  })

  it('shows them all once the rest is loaded', () => {
    const all = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'].map(reference)
    const cards = referenceCards(task, all)
    expect(ids(cards)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'])
    expect(cards.more).toBe(0)
  })

  it('has no tile when every reference came with the task', () => {
    expect(referenceCards({ ...task, references_total: 5 }, undefined).more).toBe(0)
  })
})
