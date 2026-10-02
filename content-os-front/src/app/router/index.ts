import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '@/entities/session'
import { ActivityPage } from '@/pages/activity'
import { ContentPage } from '@/pages/content'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import {
  OnboardingLayout,
  OnboardingProfileStep,
  OnboardingReviewStep,
  OnboardingRoleStep,
  OnboardingStatusPage,
} from '@/pages/onboarding'
import { ProductCreatePage } from '@/pages/product-create'
import { ProductsPage } from '@/pages/products'
import { ReferencesPage } from '@/pages/references'
import { ShootsPage } from '@/pages/shoots'
import { SignupPage } from '@/pages/signup'
import { TasksPage } from '@/pages/tasks'
import AppLayout from '../layouts/AppLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import { installAccessGuard } from './access'

// Brands only see Home, Products and Content.
const team: Role[] = ['art_director', 'creator']

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      meta: { access: 'approved' },
      children: [
        { path: '', name: 'home', component: HomePage },
        { path: 'tasks', name: 'tasks', component: TasksPage, meta: { roles: team } },
        { path: 'shoots', name: 'shoots', component: ShootsPage, meta: { roles: team } },
        { path: 'products', name: 'products', component: ProductsPage },
        {
          path: 'products/new',
          name: 'product-create',
          component: ProductCreatePage,
          meta: { section: 'products' },
        },
        { path: 'content', name: 'content', component: ContentPage },
        {
          path: 'references',
          name: 'references',
          component: ReferencesPage,
          meta: { roles: team },
        },
        { path: 'activity', name: 'activity', component: ActivityPage, meta: { roles: team } },
      ],
    },
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
