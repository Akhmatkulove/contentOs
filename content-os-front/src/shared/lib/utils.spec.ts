import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('keeps the last of conflicting classes', () => {
    expect(cn('border-neutral-300', 'border-violet-400')).toBe('border-violet-400')
  })

  it('treats typography tokens as font sizes, not colors', () => {
    expect(cn('text-p3', 'text-neutral-700')).toBe('text-p3 text-neutral-700')
    expect(cn('text-neutral-700', 'text-h3')).toBe('text-neutral-700 text-h3')
  })

  it('resolves conflicts between typography tokens', () => {
    expect(cn('text-p1', 'text-p3')).toBe('text-p3')
  })
})
