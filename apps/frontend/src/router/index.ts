import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/signin',
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/views/CompanySignUp.vue'),
      meta: { redirectIfAuthed: true },
    },
    {
      path: '/signin',
      name: 'signin',
      component: () => import('@/views/CompanySignIn.vue'),
      meta: { redirectIfAuthed: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      // OAuth placeholder — wired in a later phase
      redirect: '/signin',
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Block all navigation until the stored token (if any) has been validated
  // against the backend. Subsequent calls to hydrate() are no-ops.
  if (!authStore.isHydrated) {
    await authStore.hydrate()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'signin' }
  }

  if (to.meta.redirectIfAuthed && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
