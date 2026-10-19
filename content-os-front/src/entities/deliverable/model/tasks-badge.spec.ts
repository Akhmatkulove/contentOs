import { attentionStatus } from './tasks-badge'

describe('attentionStatus', () => {
  it('counts what waits for the user: changes for a creator, review for an art director', () => {
    expect(attentionStatus('creator')).toBe('needs_changes')
    expect(attentionStatus('art_director')).toBe('needs_review')
    expect(attentionStatus('brand')).toBeNull()
    expect(attentionStatus(undefined)).toBeNull()
  })
})
