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
      path: '/welcome',
      name: 'welcome',
      component: () => import('@/views/Welcome.vue'),
      meta: { requiresAuth: true },
    },
    // ── Recruiter app shell (pathless parent renders chrome once; children
    //    render through its <RouterView/>, so it never remounts on nav) ────────
    {
      path: '',
      component: () => import('@/layouts/RecruiterLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '/dashboard',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: '/jobs',
          name: 'jobs',
          component: () => import('@/views/JobsList.vue'),
        },
        {
          path: '/jobs/new',
          name: 'job-new',
          component: () => import('@/views/JobForm.vue'),
        },
        {
          path: '/jobs/:id/edit',
          name: 'job-edit',
          component: () => import('@/views/JobForm.vue'),
          props: true,
        },
        {
          path: '/candidates',
          name: 'candidates',
          component: () => import('@/views/CandidatesList.vue'),
        },
        {
          path: '/candidates/:id',
          name: 'candidate-detail',
          component: () => import('@/views/CandidateDetail.vue'),
          props: true,
        },
        {
          path: '/pipeline',
          name: 'pipeline',
          component: () => import('@/views/Pipeline.vue'),
        },
        {
          path: '/analytics',
          name: 'analytics',
          component: () => import('@/views/Analytics.vue'),
        },
      ],
    },
    // ── Candidate (job-seeker) auth ──────────────────────────────────────────
    {
      path: '/candidate/signup',
      name: 'candidate-signup',
      component: () => import('@/views/CandidateSignUp.vue'),
    },
    {
      path: '/candidate/signin',
      name: 'candidate-signin',
      component: () => import('@/views/CandidateSignIn.vue'),
    },
    // ── Candidate app shell ──────────────────────────────────────────────────
    {
      path: '',
      component: () => import('@/layouts/CandidateLayout.vue'),
      children: [
        {
          path: '/candidate/dashboard',
          name: 'candidate-dashboard',
          component: () => import('@/views/CandidateDashboard.vue'),
        },
      ],
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
