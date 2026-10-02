import { AxiosError, type AxiosResponse } from 'axios'
import { loginErrorMessage } from './login-form'

function failure(status: number) {
  const response = { status, data: {}, headers: {}, config: {} } as AxiosResponse
  return new AxiosError('failed', undefined, undefined, undefined, response)
}

describe('loginErrorMessage', () => {
  it('names wrong credentials', () => {
    expect(loginErrorMessage(failure(401))).toBe('Invalid email or password.')
  })

  it('asks to wait after too many attempts', () => {
    expect(loginErrorMessage(failure(429))).toContain('Too many attempts')
  })

  it('falls back to a generic message', () => {
    expect(loginErrorMessage(failure(500))).toBe('Something went wrong. Please try again.')
    expect(loginErrorMessage(new Error('offline'))).toBe('Something went wrong. Please try again.')
  })
})
