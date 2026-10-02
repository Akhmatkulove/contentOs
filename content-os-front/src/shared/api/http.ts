import axios from 'axios'
import { API_URL } from '@/shared/config'
import { toApiError } from './api-error'

export const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Callers only ever see ApiError, never the axios internals.
http.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toApiError(error)))
