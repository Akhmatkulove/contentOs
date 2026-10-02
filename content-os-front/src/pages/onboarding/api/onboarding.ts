import type { Me } from '@/entities/session'
import { http, type Schemas } from '@/shared/api'

// Answers are saved per step; fields left out stay as they are.
export async function saveAnswers(answers: Schemas['OnboardingUpdate']): Promise<Me> {
  return (await http.patch<Me>('/me/onboarding', answers)).data
}

export async function submitApplication(): Promise<Me> {
  return (await http.post<Me>('/me/onboarding/submit')).data
}

// "Edit my details": takes the application back from review (or after a rejection).
export async function reopenApplication(): Promise<Me> {
  return (await http.post<Me>('/me/onboarding/reopen')).data
}

export async function uploadPhoto(photo: File): Promise<Me> {
  const form = new FormData()
  form.append('photo', photo)
  return (
    await http.put<Me>('/me/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Up to 5MB over a slow mobile connection.
      timeout: 60_000,
    })
  ).data
}
