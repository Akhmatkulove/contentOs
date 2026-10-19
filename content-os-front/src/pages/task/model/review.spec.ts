import * as v from 'valibot'
import type { DeliverableReview, ReviewCreator } from '../api/review'
import {
  approvedLabel,
  creatorStatus,
  decisionSchema,
  FEEDBACK_MAX,
  lastUploaded,
  pickCreator,
  pickVersion,
  toCreators,
  waitingReason,
} from './review'

function creator(
  name: string,
  status: ReviewCreator['status'],
  versions: Partial<ReviewCreator['versions'][number]>[] = [],
): ReviewCreator {
  return {
    member: { id: name.toLowerCase(), name, photo_url: null },
    role: 'creator',
    status,
    versions: versions.map((version, index) => ({
      id: `${name}-v${versions.length - index}`,
      number: versions.length - index,
      title: null,
      author: { id: name.toLowerCase(), name, photo_url: null },
      created_at: '2024-09-18T14:00:00Z',
      submitted_at: '2024-09-18T14:22:00Z',
      review: null,
      reviewed_at: null,
      feedback: null,
      files: [],
      ...version,
    })),
  }
}

function review(creators: ReviewCreator[]): DeliverableReview {
  return {
    id: 'd',
    name: 'Walking transition',
    status: 'needs_review',
    due_date: null,
    shoot: { id: 's', name: 'Shoot 04', date: '2024-09-18' },
    product: { id: 'p', name: 'Cream Dress 011', sku: 'DRS-011', photo: null },
    assignees: creators.map((item) => item.member),
    references: [],
    references_total: 0,
    creators,
    can_send: false,
  }
}

function errors(input: unknown) {
  const result = v.safeParse(decisionSchema, input)
  return result.success ? {} : v.flatten<typeof decisionSchema>(result.issues).nested
}

describe('decisionSchema', () => {
  it('approves with or without feedback', () => {
    expect(errors({ decision: 'approved', feedback: '' })).toEqual({})
    expect(v.parse(decisionSchema, { decision: 'approved', feedback: '  Nice  ' })).toEqual({
      decision: 'approved',
      feedback: 'Nice',
    })
  })

  it('asks what to change before requesting changes', () => {
    expect(errors({ decision: 'changes_requested', feedback: '   ' })).toEqual({
      feedback: ['Tell the creator what to change.'],
    })
    expect(errors({ decision: 'changes_requested', feedback: 'Start closer' })).toEqual({})
  })

  it('keeps the backend’s length limit', () => {
    expect(errors({ decision: 'approved', feedback: 'x'.repeat(FEEDBACK_MAX + 1) })).toEqual({
      feedback: [`Keep the feedback under ${FEEDBACK_MAX} characters.`],
    })
  })
})

describe('toCreators', () => {
  it('puts the decision on each version and the wait on the latest only', () => {
    const [lana] = toCreators(
      review([
        creator('Lana', 'needs_review', [
          { title: 'V1.01' },
          { review: 'changes_requested', feedback: 'Closer' },
        ]),
      ]),
    )
    expect(lana!.role).toBe('Creator')
    const [latest, first] = lana!.versions
    expect(latest).toMatchObject({
      label: 'V1.01',
      latest: true,
      status: { label: 'Needs review', tone: 'warning' },
    })
    expect(first).toMatchObject({
      label: 'V1',
      latest: false,
      feedback: 'Closer',
      status: { label: 'Needs changes', tone: 'danger' },
    })
  })
})

describe('pickCreator', () => {
  const creators = toCreators(
    review([creator('Lana', 'approved'), creator('Odina', 'needs_review')]),
  )

  it('keeps the creator from the URL', () => {
    expect(pickCreator(creators, 'lana')?.name).toBe('Lana')
  })

  it('opens on the first work waiting for review', () => {
    expect(pickCreator(creators, '')?.name).toBe('Odina')
    expect(pickCreator(creators, 'gone')?.name).toBe('Odina')
  })

  it('falls back to the first creator, or none', () => {
    expect(pickCreator(toCreators(review([creator('Lana', 'to_shoot')])), '')?.name).toBe('Lana')
    expect(pickCreator([], '')).toBeNull()
  })
})

describe('pickVersion', () => {
  const [lana] = toCreators(review([creator('Lana', 'needs_review', [{}, {}])]))

  it('takes the picked version or the latest', () => {
    expect(pickVersion(lana!.versions, 'Lana-v1')?.label).toBe('V1')
    expect(pickVersion(lana!.versions, null)?.label).toBe('V2')
    expect(pickVersion([], null)).toBeNull()
  })
})

describe('waiting for Send to brand', () => {
  const creators = toCreators(
    review([
      creator('Lana', 'approved'),
      creator('Odina', 'needs_review'),
      creator('Bek', 'needs_changes'),
      creator('Aziz', 'in_progress'),
    ]),
  )

  it('says why each creator holds it', () => {
    expect(creators.map(waitingReason)).toEqual([
      null,
      'Odina’s work needs your review',
      'Bek is making changes',
      'Aziz hasn’t uploaded yet',
    ])
    expect(approvedLabel(creators)).toBe('1 of 4 approved')
  })

  it('shows unstarted work as not uploaded', () => {
    expect(creatorStatus('to_shoot')).toEqual({ label: 'Not uploaded yet', tone: 'info' })
    expect(creatorStatus('approved').label).toBe('Approved')
  })
})

describe('lastUploaded', () => {
  it('takes the newest latest version across creators', () => {
    const latest = lastUploaded(
      review([
        creator('Lana', 'needs_review', [{ submitted_at: '2024-09-18T10:00:00Z' }]),
        creator('Odina', 'needs_review', [{ submitted_at: '2024-09-19T10:00:00Z' }]),
        creator('Bek', 'to_shoot'),
      ]),
    )
    expect(latest).toMatch(/^Uploaded Sep 19, /)
    expect(lastUploaded(review([creator('Bek', 'to_shoot')]))).toBeNull()
  })
})
