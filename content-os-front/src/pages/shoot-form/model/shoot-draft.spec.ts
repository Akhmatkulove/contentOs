import { selectAllState, selectionLabel, toggleSelection } from './shoot-draft'

describe('selectionLabel', () => {
  it('counts the picked products out of all of them', () => {
    expect(selectionLabel(4, 4)).toBe('4 selected / 4 products')
    expect(selectionLabel(0, 1)).toBe('0 selected / 1 product')
  })
})

describe('selectAllState', () => {
  it('is ticked only when every row is picked', () => {
    expect(selectAllState(6, 6)).toBe(true)
    expect(selectAllState(2, 6)).toBe('indeterminate')
    expect(selectAllState(0, 6)).toBe(false)
  })

  it('stays empty with no rows', () => {
    expect(selectAllState(0, 0)).toBe(false)
  })
})

describe('toggleSelection', () => {
  it('adds a ticked id once and drops an unticked one', () => {
    expect(toggleSelection(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'a', false)).toEqual(['b'])
  })
})
