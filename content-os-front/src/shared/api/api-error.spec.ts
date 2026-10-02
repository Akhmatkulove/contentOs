import { AxiosError, CanceledError, type AxiosResponse } from 'axios'
import { ApiError, errorStatus, toApiError } from './api-error'

function axiosFailure(status: number, data: unknown = {}) {
  const response = { status, data, headers: {}, config: {} } as AxiosResponse
  return new AxiosError('Request failed', undefined, undefined, undefined, response)
}

describe('toApiError', () => {
  it('takes the status and the backend message', () => {
    const error = toApiError(axiosFailure(409, { detail: 'Email is already registered' }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('Email is already registered')
  })

  it('collects per-field messages from a validation error', () => {
    const detail = [
      { loc: ['body', 'email'], msg: 'value is not a valid email address' },
      { loc: ['body', 'password'], msg: 'too short' },
    ]

    expect(toApiError(axiosFailure(422, { detail })).fields).toEqual({
      email: 'value is not a valid email address',
      password: 'too short',
    })
  })

  it('treats a missing answer as status 0', () => {
    expect(toApiError(new AxiosError('Network Error')).status).toBe(0)
  })

  it('marks aborted requests', () => {
    expect(toApiError(new CanceledError()).canceled).toBe(true)
  })

  it('wraps anything else and leaves ApiError as it is', () => {
    const apiError = new ApiError(500, 'boom')

    expect(toApiError(apiError)).toBe(apiError)
    expect(toApiError(new TypeError('oops'))).toMatchObject({ status: 0, message: 'oops' })
  })
})

describe('errorStatus', () => {
  it('reads both axios errors and ApiError', () => {
    expect(errorStatus(axiosFailure(401))).toBe(401)
    expect(errorStatus(new ApiError(429, 'slow down'))).toBe(429)
    expect(errorStatus(new AxiosError('Network Error'))).toBeUndefined()
  })
})
