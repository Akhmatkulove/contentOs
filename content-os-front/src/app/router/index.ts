import { createRouter, createWebHistory } from 'vue-router'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/login', name: 'login', component: LoginPage },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/not-found').then((m) => m.NotFoundPage),
    },
  ],
})
