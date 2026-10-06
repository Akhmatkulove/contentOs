import { describe, expect, it } from 'vitest'
import { formatDuration, linkHost } from './reference'

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [28, '0:28'],
    [65, '1:05'],
    [3725, '1:02:05'],
    [28.9, '0:28'],
    [-5, '0:00'],
  ])('%d → %s', (sec, expected) => {
    expect(formatDuration(sec)).toBe(expected)
  })
})

describe('linkHost', () => {
  it('names a link by its host', () => {
    expect(linkHost('https://www.instagram.com/p/abc/')).toBe('instagram.com')
    expect(linkHost('not a url')).toBe('not a url')
  })
})
