import { reactive } from 'vue'

export type Role = 'creator' | 'manager' | 'brand'

// Answers collected across the onboarding steps until the application is sent.
export const draft = reactive<{ role: Role | null; name: string; photo: File | null }>({
  role: null,
  name: '',
  photo: null,
})
