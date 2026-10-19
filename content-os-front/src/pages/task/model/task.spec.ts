import type { ContentVersionResponse } from '@/entities/deliverable'
import { ApiError } from '@/shared/api'
import { toVersions, uploadFailure, uploadPercent } from './task'

function version(number: number, overrides: Partial<ContentVersionResponse> = {}) {
  return {
    id: `v${number}`,
    number,
    title: null,
    author: { id: 'lana', name: 'Lana', photo_url: null },
    created_at: '2024-09-18T14:00:00Z',
    submitted_at: '2024-09-18T14:22:00Z',
    review: null,
    reviewed_at: null,
    feedback: null,
    files: [
      {
        id: `f${number}`,
        kind: 'video',
        content_type: 'video/mp4',
        url: 'https://files/f.mp4',
        name: 'walking_take_1.mp4',
        size: 13_002_342,
      },
    ],
    ...overrides,
  } satisfies ContentVersionResponse
}

describe('uploadPercent', () => {
  it('holds at 99 until the server answers', () => {
    expect(uploadPercent(0.456, false)).toBe(46)
    expect(uploadPercent(1, false)).toBe(99)
    expect(uploadPercent(1, true)).toBe(100)
  })
})

describe('uploadFailure', () => {
  it('offers Retry only when trying again may help', () => {
    expect(uploadFailure(new ApiError(0, 'offline'))).toEqual({
      message: 'Upload failed',
      retryable: true,
    })
    expect(uploadFailure(new ApiError(502, 'bad gateway')).retryable).toBe(true)
    expect(uploadFailure(new ApiError(422, 'Only JPEG, PNG, WebP images'))).toEqual({
      message: 'Only JPEG, PNG, WebP images',
      retryable: false,
    })
    expect(uploadFailure(new ApiError(413, 'too big'))).toEqual({
      message: 'The file is too large.',
      retryable: false,
    })
  })
})

describe('toVersions', () => {
  const versions = [version(2, { title: 'V1.01' }), version(1)]

  it('names versions by their title or number', () => {
    const [latest, first] = toVersions(versions)
    expect([latest!.label, first!.label]).toEqual(['V1.01', 'V1'])
    expect(latest!.files[0]).toMatchObject({ name: 'walking_take_1.mp4', size: '12.4 MB' })
    expect(latest!.files[0]!.video).toBe(true)
  })

  it('shows each version’s decision; undecided ones wait while nothing is picked', () => {
    const [latest, first] = toVersions(versions)
    expect(latest!.status).toEqual({ label: 'On review', tone: 'warning' })
    expect(first!.status).toEqual({ label: 'On review', tone: 'warning' })

    // One is picked: the rest no longer wait.
    const picked = toVersions([version(2), version(1, { review: 'approved' })])
    expect([picked[0]!.status, picked[1]!.status?.label]).toEqual([null, 'Approved'])

    const reviewed = toVersions([
      version(2),
      version(1, { review: 'changes_requested', feedback: 'Start closer' }),
    ])
    expect(reviewed[1]).toMatchObject({
      status: { label: 'Needs changes', tone: 'danger' },
      feedback: 'Start closer',
      needsChanges: true,
    })
    expect(reviewed[0]!.needsChanges).toBe(false)
  })

  it('names the authors and keeps the wait author by author', () => {
    const odina = { id: 'odina', name: 'Odina', photo_url: null }
    const [first, second, third] = toVersions([
      version(1, { id: 'o1', author: odina }),
      version(2),
      version(1, { review: 'changes_requested' }),
    ])
    expect([first!.author, second!.author]).toEqual(['Odina', 'Lana'])
    expect([first!.status?.label, second!.status?.label, third!.status?.label]).toEqual([
      'On review',
      'On review',
      'Needs changes',
    ])
    // Odina's work is picked: her other undecided version doesn't wait; Lana's does.
    const decided = toVersions([
      version(2, { id: 'o2', author: odina }),
      version(1, { id: 'o1', author: odina, review: 'approved' }),
      version(2, { review: 'changes_requested' }),
      version(1),
    ])
    expect([decided[0]!.status, decided[3]!.status?.label]).toEqual([null, 'On review'])
    expect(toVersions([version(1)])[0]!.author).toBeNull()
  })
})
