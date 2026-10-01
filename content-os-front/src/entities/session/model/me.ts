// Mirrors MeResponse in content-os-back/src/app/auth/schemas.py.
// Role and status are separate on purpose, see docs/adr/0001-auth-and-roles.md.

export type Role = 'brand' | 'art_director' | 'creator'

export type Status = 'onboarding' | 'pending_review' | 'approved' | 'rejected'

export type OnboardingStep = 'role' | 'profile' | 'review'

export interface Me {
  id: string
  email: string
  role: Role | null
  status: Status
  name: string | null
  photo_url: string | null
  // Where to resume onboarding; null outside of it.
  onboarding_step: OnboardingStep | null
}
