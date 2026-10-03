import { AxiosError, type AxiosResponse } from 'axios'
import * as v from 'valibot'
import { loginErrorMessage, loginSchema } from './login-form'

function failure(status: number) {
  const response = { status, data: {}, headers: {}, config: {} } as AxiosResponse
  return new AxiosError('failed', undefined, undefined, undefined, response)
}

describe('loginSchema', () => {
  it('accepts a valid email with any password', () => {
    expect(v.is(loginSchema, { email: 'anna@example.com', password: 'x' })).toBe(true)
  })

  it('flags a malformed email', () => {
    const result = v.safeParse(loginSchema, { email: 'anna', password: 'anna-password' })
    expect(result.success ? {} : v.flatten<typeof loginSchema>(result.issues).nested).toEqual({
      email: ['Enter a valid email address.'],
    })
  })
})

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
