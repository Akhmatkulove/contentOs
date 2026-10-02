import { ApiError } from './api-error'
import { errorMessage, shouldToast } from './request-meta'

describe('shouldToast', () => {
  it('toasts errors nobody handled', () => {
    expect(shouldToast(new ApiError(500, ''), undefined)).toBe(true)
    expect(shouldToast(new ApiError(0, ''), {})).toBe(true)
  })

  it('stays quiet when the screen handles the error', () => {
    expect(shouldToast(new ApiError(500, ''), { toast: false })).toBe(false)
  })

  it('stays quiet for cancelled requests and for 401/403, which redirect instead', () => {
    expect(shouldToast(new ApiError(0, '', {}, true), undefined)).toBe(false)
    expect(shouldToast(new ApiError(401, ''), undefined)).toBe(false)
    expect(shouldToast(new ApiError(403, ''), undefined)).toBe(false)
  })
})

describe('errorMessage', () => {
  it('explains a lost connection apart from a server failure', () => {
    expect(errorMessage(new ApiError(0, ''))).toContain('No connection')
    expect(errorMessage(new ApiError(500, ''))).toBe('Something went wrong. Please try again.')
  })
})
