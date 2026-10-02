import { errorStatus, http, type Schemas } from '@/shared/api'
import { API_URL } from '@/shared/config'
import type { Me } from '../model/me'

export type Credentials = Schemas['LoginRequest']

// The signed-in user, or null without a session.
export async function fetchMe(): Promise<Me | null> {
  try {
    return (await http.get<Me>('/me')).data
  } catch (error) {
    if (errorStatus(error) === 401) return null
    throw error
  }
}

export async function signup(credentials: Schemas['SignupRequest']): Promise<Me> {
  return (await http.post<Me>('/auth/signup', credentials)).data
}

export async function login(credentials: Credentials): Promise<Me> {
  return (await http.post<Me>('/auth/login', credentials)).data
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout')
}

// A full-page navigation, not an XHR: the backend redirects to Google and back.
export function continueWithGoogle() {
  window.location.assign(`${API_URL}/auth/google`)
}
