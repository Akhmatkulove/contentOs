import { firstAndMore, selectionLabel, toggleSelection } from './shoot-draft'

describe('selectionLabel', () => {
  it('counts the picked products out of all of them', () => {
    expect(selectionLabel(4, 4)).toBe('4 selected / 4 products')
    expect(selectionLabel(0, 1)).toBe('0 selected / 1 product')
  })
})

describe('toggleSelection', () => {
  it('adds a ticked id once and drops an unticked one', () => {
    expect(toggleSelection(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'a', false)).toEqual(['b'])
  })
})

describe('firstAndMore', () => {
  it('names the first and counts the rest', () => {
    expect(firstAndMore([])).toBe('')
    expect(firstAndMore(['Amina'])).toBe('Amina')
    expect(firstAndMore(['Amina', 'Odina', 'Lana'])).toBe('Amina +2')
  })
})
