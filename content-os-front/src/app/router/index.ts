import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '@/entities/session'
import AppLayout from '../layouts/AppLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import { installAccessGuard } from './access'

// Each page's code loads on its first visit; the layouts are in the main bundle.

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
        { path: '', name: 'home', component: () => import('@/pages/home').then((m) => m.HomePage) },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/pages/tasks').then((m) => m.TasksPage),
          meta: { roles: team },
        },
        {
          path: 'tasks/:id/review',
          name: 'task-review',
          component: () => import('@/pages/task').then((m) => m.TaskReviewPage),
          props: true,
          // The shoot's art director reviews every assignee's work (docs/adr/0015);
          // the review belongs to the shoot, so Shoots stays highlighted.
          meta: { section: 'shoots', roles: ['art_director'] },
        },
        {
          path: 'tasks/:id',
          name: 'task',
          component: () => import('@/pages/task').then((m) => m.TaskPage),
          props: true,
          meta: { section: 'tasks', roles: team },
        },
        {
          path: 'shoots',
          name: 'shoots',
          component: () => import('@/pages/shoots').then((m) => m.ShootsPage),
          meta: { roles: team },
        },
        {
          path: 'shoots/new',
          name: 'shoot-create',
          component: () => import('@/pages/shoot-form').then((m) => m.ShootCreatePage),
          // The art director creates a shoot and is its art director.
          meta: { section: 'shoots', roles: ['art_director'] },
        },
        {
          path: 'shoots/:id/edit',
          name: 'shoot-edit',
          component: () => import('@/pages/shoot-form').then((m) => m.ShootEditPage),
          props: true,
          // Only the art director who created the shoot edits it (docs/adr/0008).
          meta: { section: 'shoots', roles: ['art_director'] },
        },
        {
          path: 'shoots/:id',
          name: 'shoot',
          component: () => import('@/pages/shoot').then((m) => m.ShootPage),
          props: true,
          meta: { section: 'shoots', roles: team },
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('@/pages/products').then((m) => m.ProductsPage),
        },
        {
          path: 'products/new',
          name: 'product-create',
          component: () => import('@/pages/product-form').then((m) => m.ProductCreatePage),
          // Only brands create products; the team gets them through deliverables.
          meta: { section: 'products', roles: ['brand'] },
        },
        {
          path: 'products/:id',
          name: 'product',
          component: () => import('@/pages/product').then((m) => m.ProductPage),
          props: true,
          meta: { section: 'products' },
        },
        {
          path: 'products/:id/edit',
          name: 'product-edit',
          component: () => import('@/pages/product-form').then((m) => m.ProductEditPage),
          props: true,
          // The backend lets only the owning brand save; the form sends others to the page.
          meta: { section: 'products', roles: ['brand'] },
        },
        {
          path: 'content',
          name: 'content',
          component: () => import('@/pages/content').then((m) => m.ContentPage),
          meta: { title: 'Content' },
        },
        {
          path: 'references',
          name: 'references',
          component: () => import('@/pages/references').then((m) => m.ReferencesPage),
          meta: { roles: team, title: 'References' },
        },
        {
          path: 'references/:id',
          name: 'reference',
          component: () => import('@/pages/references').then((m) => m.ReferencePage),
          props: true,
          meta: { section: 'references', roles: team },
        },
        {
          path: 'activity',
          name: 'activity',
          component: () => import('@/pages/activity').then((m) => m.ActivityPage),
          meta: { roles: team },
        },
        // From the account menu at the bottom of the sidebar; no nav section.
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/pages/profile').then((m) => m.ProfilePage),
        },
        {
          path: 'help',
          name: 'help',
          component: () => import('@/pages/help').then((m) => m.HelpPage),
        },
        {
          path: 'help/:slug',
          name: 'help-article',
          component: () => import('@/pages/help').then((m) => m.HelpArticlePage),
          props: true,
        },
      ],
    },
    {
      path: '/',
      component: AuthLayout,
      meta: { access: 'guest' },
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/pages/login').then((m) => m.LoginPage),
        },
        {
          path: 'signup',
          name: 'signup',
          component: () => import('@/pages/signup').then((m) => m.SignupPage),
        },
      ],
    },
    {
      path: '/onboarding',
      component: () => import('@/pages/onboarding').then((m) => m.OnboardingLayout),
      children: [
        { path: '', redirect: { name: 'onboarding-role' } },
        {
          path: 'role',
          name: 'onboarding-role',
          component: () => import('@/pages/onboarding').then((m) => m.OnboardingRoleStep),
          meta: { access: 'onboarding', step: 'role' },
        },
        {
          path: 'profile',
          name: 'onboarding-profile',
          component: () => import('@/pages/onboarding').then((m) => m.OnboardingProfileStep),
          meta: { access: 'onboarding', step: 'profile' },
        },
        {
          path: 'review',
          name: 'onboarding-review',
          component: () => import('@/pages/onboarding').then((m) => m.OnboardingReviewStep),
          meta: { access: 'onboarding', step: 'review' },
        },
        {
          path: 'status',
          name: 'onboarding-status',
          component: () => import('@/pages/onboarding').then((m) => m.OnboardingStatusPage),
          meta: { access: 'review' },
        },
      ],
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/pages/admin').then((m) => m.AdminPage),
      meta: { access: 'admin' },
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
