import {
  durationLabel,
  fileSizeLabel,
  toContentFile,
  versionLabel,
  versionStatus,
  workWaits,
} from './content'

describe('fileSizeLabel', () => {
  it('shows megabytes with one decimal and small files in kilobytes', () => {
    expect(fileSizeLabel(13_002_342)).toBe('12.4 MB')
    expect(fileSizeLabel(300_000)).toBe('293 KB')
    expect(fileSizeLabel(10)).toBe('1 KB')
  })
})

describe('durationLabel', () => {
  it('writes seconds as minutes and seconds', () => {
    expect(durationLabel(15.2)).toBe('0:15')
    expect(durationLabel(65)).toBe('1:05')
  })
})

describe('toContentFile', () => {
  it('names a file without a name by its kind', () => {
    const file = {
      id: 'f',
      kind: 'video',
      content_type: 'video/mp4',
      url: 'https://files/f.mp4',
      name: null,
      size: 13_002_342,
    } as const
    expect(toContentFile(file)).toEqual({
      id: 'f',
      name: 'Video',
      size: '12.4 MB',
      url: 'https://files/f.mp4',
      video: true,
    })
  })
})

describe('versionLabel', () => {
  it('prefers the title to the number', () => {
    expect(versionLabel({ title: 'V1.01', number: 2 })).toBe('V1.01')
    expect(versionLabel({ title: null, number: 2 })).toBe('V2')
  })
})

describe('versionStatus', () => {
  it('shows the decision on any version and the wait while the work waits', () => {
    expect(versionStatus('approved', false, 'On review')).toEqual({
      label: 'Approved',
      tone: 'success',
    })
    expect(versionStatus('changes_requested', true, 'On review')).toEqual({
      label: 'Needs changes',
      tone: 'danger',
    })
    expect(versionStatus(null, true, 'Needs review')).toEqual({
      label: 'Needs review',
      tone: 'warning',
    })
    expect(versionStatus(null, false, 'Needs review')).toBeNull()
  })
})

describe('workWaits', () => {
  it('waits while a version is undecided and nothing is picked', () => {
    expect(workWaits([{ review: null }, { review: 'changes_requested' }])).toBe(true)
    // A fixed earlier version waits too, whatever the latest got.
    expect(workWaits([{ review: 'changes_requested' }, { review: null }])).toBe(true)
    expect(workWaits([{ review: null }, { review: 'approved' }])).toBe(false)
    expect(workWaits([{ review: 'changes_requested' }])).toBe(false)
    expect(workWaits([])).toBe(false)
  })
})
