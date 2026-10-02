import type { Schemas } from '@/shared/api'

// Role and status are separate on purpose, see docs/adr/0001-auth-and-roles.md.
export type Me = Schemas['MeResponse']

export type Role = Schemas['Role']

export type Status = Schemas['Status']

// Where to resume onboarding; null outside of it.
export type OnboardingStep = NonNullable<Me['onboarding_step']>
