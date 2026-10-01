import { createRouter, createWebHistory } from 'vue-router'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
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
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/not-found').then((m) => m.NotFoundPage),
    },
  ],
})
