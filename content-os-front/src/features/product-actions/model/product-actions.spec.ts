import { archiveLabel } from './product-actions'

describe('archiveLabel', () => {
  it('archives an active product and restores an archived one', () => {
    expect(archiveLabel('active')).toBe('Archive product')
    expect(archiveLabel('archived')).toBe('Restore product')
  })
})
