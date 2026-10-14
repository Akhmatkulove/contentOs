import type { TaskVersionResponse } from '../api/task'
import { ApiError } from '@/shared/api'
import { durationLabel, fileSizeLabel, toVersions, uploadFailure, uploadPercent } from './task'

function version(number: number, overrides: Partial<TaskVersionResponse> = {}) {
  return {
    id: `v${number}`,
    number,
    title: null,
    author: { id: 'lana', name: 'Lana', photo_url: null },
    created_at: '2024-09-18T14:00:00Z',
    submitted_at: '2024-09-18T14:22:00Z',
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
  } satisfies TaskVersionResponse
}

describe('fileSizeLabel', () => {
  it('shows megabytes with one decimal and small files in kilobytes', () => {
    expect(fileSizeLabel(13_002_342)).toBe('12.4 MB')
    expect(fileSizeLabel(300_000)).toBe('293 KB')
    expect(fileSizeLabel(10)).toBe('1 KB')
  })
})

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

describe('durationLabel', () => {
  it('writes seconds as minutes and seconds', () => {
    expect(durationLabel(15.2)).toBe('0:15')
    expect(durationLabel(65)).toBe('1:05')
  })
})

describe('toVersions', () => {
  const versions = [version(2, { title: 'V1.01' }), version(1)]

  it('names versions by their title or number', () => {
    const [latest, first] = toVersions(versions, 'needs_review')
    expect([latest!.label, first!.label]).toEqual(['V1.01', 'V1'])
    expect(latest!.files[0]).toMatchObject({ name: 'walking_take_1.mp4', size: '12.4 MB' })
    expect(latest!.files[0]!.video).toBe(true)
  })

  it('puts the review state on the latest version only', () => {
    const [latest, first] = toVersions(versions, 'needs_review')
    expect(latest!.status).toEqual({ label: 'On review', tone: 'warning' })
    expect(first!.status).toBeNull()
    expect(toVersions(versions, 'in_progress')[0]!.status).toBeNull()
  })
})
