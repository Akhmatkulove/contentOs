import { createRouter, createWebHistory } from 'vue-router'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import {
  OnboardingLayout,
  OnboardingProfileStep,
  OnboardingReviewStep,
  OnboardingRoleStep,
  OnboardingStatusPage,
} from '@/pages/onboarding'
import { SignupPage } from '@/pages/signup'
import AuthLayout from '../layouts/AuthLayout.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    {
      path: '/',
      component: AuthLayout,
      children: [
        { path: 'login', name: 'login', component: LoginPage },
        { path: 'signup', name: 'signup', component: SignupPage },
      ],
    },
    {
      path: '/onboarding',
      component: OnboardingLayout,
      children: [
        { path: '', redirect: { name: 'onboarding-role' } },
        { path: 'role', name: 'onboarding-role', component: OnboardingRoleStep },
        { path: 'profile', name: 'onboarding-profile', component: OnboardingProfileStep },
        { path: 'review', name: 'onboarding-review', component: OnboardingReviewStep },
        { path: 'status', name: 'onboarding-status', component: OnboardingStatusPage },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/not-found').then((m) => m.NotFoundPage),
    },
  ],
})
