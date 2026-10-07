import { membersByIds, pickable } from './shoot-team'

const lana = { id: 'lana', name: 'Lana', photo_url: null }
const amina = { id: 'amina', name: 'Amina', photo_url: null }
const odina = { id: 'odina', name: 'Odina', photo_url: null }
const pool = [amina, lana, odina]

describe('membersByIds', () => {
  it('keeps the order people were picked in', () => {
    expect(membersByIds(pool, ['odina', 'amina'])).toEqual([odina, amina])
  })

  it('skips ids no longer in the team', () => {
    expect(membersByIds(pool, ['gone', 'lana'])).toEqual([lana])
  })
})

describe('pickable', () => {
  it('leaves out who already has a job on the shoot', () => {
    expect(pickable(pool, ['lana'])).toEqual([amina, odina])
    expect(pickable(pool, [])).toEqual(pool)
  })
})
