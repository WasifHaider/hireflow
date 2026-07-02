<template>
  <div class="cand-page">
    <div class="logo">
      <div class="logo-mark">H</div>
      <span>HireFlow</span>
      <span class="pill-emerald">For Job Seekers</span>
    </div>

    <div class="cand-card">
      <!-- Verifying -->
      <div v-if="status === 'verifying'" class="state">
        <div class="spinner" />
        <h1 class="card-title">Verifying your email…</h1>
        <p class="card-sub">This only takes a moment.</p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="state">
        <div class="badge ok">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 class="card-title">You’re all set!</h1>
        <p class="card-sub">Your email is verified. Taking you to your applications…</p>
        <AppButton class="mt-22" block @click="goDashboard">
          Go to my applications
        </AppButton>
      </div>

      <!-- Error -->
      <div v-else class="state">
        <div class="badge err">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <h1 class="card-title">Verification failed</h1>
        <p class="card-sub">{{ errorMessage }}</p>
        <AppButton class="mt-22" block @click="router.push('/candidate/signup')">
          Sign up again
        </AppButton>
        <div class="card-foot">
          <div class="foot-line">
            Already verified?
            <RouterLink to="/candidate/signin" class="link">Sign in</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useCandidateAuthStore } from '@/stores/candidateAuth.store'
import { getApiErrorMessage } from '@/plugins/axios'
import AppButton from '@/components/common/AppButton.vue'

const route = useRoute()
const router = useRouter()
const candidateAuth = useCandidateAuthStore()

type Status = 'verifying' | 'success' | 'error'
const status = ref<Status>('verifying')
const errorMessage = ref('')

function goDashboard() {
  router.push('/candidate/dashboard')
}

onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || !token) {
    status.value = 'error'
    errorMessage.value = 'This verification link is missing its token. Please use the link from your email.'
    return
  }
  try {
    await candidateAuth.verifyEmail(token)
    status.value = 'success'
    // Brief pause so the user registers the success state, then redirect.
    window.setTimeout(goDashboard, 1500)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = getApiErrorMessage(
      err,
      'This link is invalid or has expired. Verification links last 24 hours — sign up again to get a fresh one.',
    )
  }
})
</script>

<style scoped>
.cand-page {
  min-height: 100dvh;
  background:
    radial-gradient(1000px 600px at 100% 0%, rgba(16, 185, 129, 0.08), transparent 60%),
    radial-gradient(1000px 600px at 0% 100%, rgba(99, 102, 241, 0.06), transparent 60%), #fbfaf7;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 16px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111827;
  -webkit-font-smoothing: antialiased;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 32px;
}
.logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #4f46e5;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
}
.pill-emerald {
  margin-left: 8px;
  padding: 4px 10px;
  border-radius: 99px;
  background: #ecfdf5;
  color: #047857;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.cand-card {
  width: 100%;
  max-width: 460px;
  background: white;
  border: 1px solid #efeee8;
  border-radius: 16px;
  padding: 44px;
  box-shadow: 0 30px 60px -20px rgba(17, 24, 39, 0.1);
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.card-title {
  margin: 18px 0 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.025em;
}
.card-sub {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: #6b7280;
}
.badge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.badge.ok { background: #ecfdf5; color: #047857; }
.badge.err { background: #fef2f2; color: #b91c1c; }
.spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #4f46e5;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.mt-22 { margin-top: 22px; width: 100%; }
.card-foot { margin-top: 18px; text-align: center; }
.foot-line { font-size: 13px; color: #6b7280; }
.link { color: #4f46e5; font-weight: 500; text-decoration: none; }
.link:hover { text-decoration: underline; }
</style>
