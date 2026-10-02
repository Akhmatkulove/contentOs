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
import { installAccessGuard } from './access'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage, meta: { access: 'approved' } },
    {
      path: '/',
      component: AuthLayout,
      meta: { access: 'guest' },
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
        {
          path: 'role',
          name: 'onboarding-role',
          component: OnboardingRoleStep,
          meta: { access: 'onboarding', step: 'role' },
        },
        {
          path: 'profile',
          name: 'onboarding-profile',
          component: OnboardingProfileStep,
          meta: { access: 'onboarding', step: 'profile' },
        },
        {
          path: 'review',
          name: 'onboarding-review',
          component: OnboardingReviewStep,
          meta: { access: 'onboarding', step: 'review' },
        },
        {
          path: 'status',
          name: 'onboarding-status',
          component: OnboardingStatusPage,
          meta: { access: 'review' },
        },
      ],
    },
    {
      path: '/error',
      name: 'server-error',
      component: () => import('@/pages/server-error').then((m) => m.ServerErrorPage),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/not-found').then((m) => m.NotFoundPage),
    },
  ],
})

installAccessGuard(router)
