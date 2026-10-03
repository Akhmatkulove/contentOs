import { AxiosError, type AxiosResponse } from 'axios'
import * as v from 'valibot'
import { signupErrorMessage, signupSchema } from './signup-form'

function failure(status: number) {
  const response = { status, data: {}, headers: {}, config: {} } as AxiosResponse
  return new AxiosError('failed', undefined, undefined, undefined, response)
}

function fieldErrors(input: { email: string; password: string; passwordRepeat: string }) {
  const result = v.safeParse(signupSchema, input)
  return result.success ? {} : v.flatten<typeof signupSchema>(result.issues).nested
}

describe('signupSchema', () => {
  it('accepts a valid email and a long enough password repeated exactly', () => {
    expect(
      fieldErrors({
        email: 'anna@example.com',
        password: 'anna-password',
        passwordRepeat: 'anna-password',
      }),
    ).toEqual({})
  })

  it('flags a bad email, a short password and a mismatched repeat', () => {
    expect(fieldErrors({ email: 'anna', password: 'short', passwordRepeat: 'other' })).toEqual({
      email: ['Enter a valid email address.'],
      password: ['Use at least 8 characters.'],
      passwordRepeat: ['Passwords don’t match.'],
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
