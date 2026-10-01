import axios from 'axios'
import { API_URL } from '@/shared/config'

export const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// HTTP status of a failed request, or undefined for network errors and non-axios errors.
export function errorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
