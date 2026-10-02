import { AxiosError, type AxiosResponse } from 'axios'
import { signupErrorMessage, validatePasswords } from './signup-form'

function failure(status: number) {
  const response = { status, data: {}, headers: {}, config: {} } as AxiosResponse
  return new AxiosError('failed', undefined, undefined, undefined, response)
}

describe('validatePasswords', () => {
  it('accepts a long enough password repeated exactly', () => {
    expect(validatePasswords('anna-password', 'anna-password')).toEqual({
      password: '',
      passwordRepeat: '',
    })
  })

  it('flags a short password and a mismatched repeat', () => {
    expect(validatePasswords('short', 'other')).toEqual({
      password: 'Use at least 8 characters.',
      passwordRepeat: 'Passwords don’t match.',
    })
  })
})

describe('signupErrorMessage', () => {
  it('puts a taken or invalid email on the email field', () => {
    expect(signupErrorMessage(failure(409)).email).toContain('already registered')
    expect(signupErrorMessage(failure(422)).email).toBe('Enter a valid email address.')
  })

  it('puts everything else on the form', () => {
    expect(signupErrorMessage(failure(429))).toEqual({
      email: '',
      form: 'Too many attempts. Please wait a few minutes and try again.',
    })
    expect(signupErrorMessage(failure(500)).form).toBe('Something went wrong. Please try again.')
  })
})
