<template>
  <div class="cand-page">
    <!-- Logo + audience badge -->
    <div class="logo">
      <div class="logo-mark">H</div>
      <span>HireFlow</span>
      <span class="pill-emerald">For Job Seekers</span>
    </div>

    <div class="cand-card">
      <div class="card-head">
        <h1 class="card-title">Welcome back.</h1>
        <p class="card-sub">Sign in to check on your applications.</p>
      </div>

      <!-- Social (OAuth lands in a later phase) -->
      <SocialButtons class="mb-22" :providers="['google', 'linkedin']" />

      <div class="divider"><span>or</span></div>

      <div v-if="showForgotAlert" class="info-alert">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Password reset is coming soon. Re-sign up with the same email to get a fresh link.
        <button class="alert-close" @click="showForgotAlert = false">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div v-if="errors.form" class="form-alert">{{ errors.form }}</div>

      <div class="fields">
        <AppField
          v-model="email"
          type="email"
          label="Email"
          placeholder="you@email.com"
          autocomplete="email"
          :error="touched.email ? errors.email : ''"
          @blur="onBlur('email')"
          @enter="handleSubmit"
        />
        <AppField
          v-model="password"
          type="password"
          label="Password"
          placeholder="••••••••••"
          autocomplete="current-password"
          :error="touched.password ? errors.password : ''"
          @blur="onBlur('password')"
          @enter="handleSubmit"
        >
          <template #label-action>
            <button type="button" class="forgot-link" @click="showForgotAlert = true">
              Forgot password?
            </button>
          </template>
        </AppField>
      </div>

      <AppButton class="mt-22" block :loading="loading" @click="handleSubmit">
        Sign in
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </AppButton>

      <div class="card-foot">
        <div class="foot-line">
          New here?
          <RouterLink to="/candidate/signup" class="link">Create an account</RouterLink>
        </div>
      </div>
    </div>

    <!-- Cross-link to recruiter signin -->
    <div class="cross-link">
      Hiring at your company?
      <RouterLink to="/signin" class="link">Sign in to your workspace →</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCandidateAuthStore } from '@/stores/candidateAuth.store'
import { getApiErrorMessage } from '@/plugins/axios'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'
import SocialButtons from '@/components/common/SocialButtons.vue'
import axios from 'axios'

const router = useRouter()
const candidateAuth = useCandidateAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const showForgotAlert = ref(false)

const errors = ref({ email: '', password: '', form: '' })
const touched = ref({ email: false, password: false })

function validateEmail() {
  const v = email.value.trim()
  if (!v) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return ''
}
function validatePassword() {
  if (!password.value) return 'Password is required'
  return ''
}

function onBlur(field: 'email' | 'password') {
  touched.value[field] = true
  if (field === 'email') errors.value.email = validateEmail()
  else errors.value.password = validatePassword()
}

const isFormValid = computed(() => !validateEmail() && !validatePassword())

async function handleSubmit() {
  touched.value.email = true
  touched.value.password = true
  errors.value.email = validateEmail()
  errors.value.password = validatePassword()
  if (!isFormValid.value) return

  errors.value.form = ''
  loading.value = true
  try {
    await candidateAuth.signinCandidate({
      email: email.value.trim().toLowerCase(),
      password: password.value,
    })
    router.push('/candidate/dashboard')
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        errors.value.form = 'Invalid email or password.'
      } else if (err.response?.status === 403) {
        errors.value.form = 'Please verify your email before signing in. Check your inbox.'
      } else {
        errors.value.form = getApiErrorMessage(err)
      }
    } else {
      errors.value.form = 'Network error. Please check your connection and try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Page shell (warm candidate variant) ─────────────────────────────────── */
.cand-page {
  min-height: 100dvh;
  background:
    radial-gradient(1000px 600px at 100% 0%, rgba(16, 185, 129, 0.08), transparent 60%),
    radial-gradient(1000px 600px at 0% 100%, rgba(99, 102, 241, 0.06), transparent 60%), #fbfaf7;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 16px;
  position: relative;
  overflow: hidden;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #111827;
  -webkit-font-smoothing: antialiased;
}
.cand-page::before {
  content: '';
  position: absolute;
  top: 80px;
  left: 10%;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a7f3d0, #6ee7b7);
  filter: blur(80px);
  opacity: 0.4;
}
.cand-page::after {
  content: '';
  position: absolute;
  bottom: 80px;
  right: 8%;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c7d2fe, #a5b4fc);
  filter: blur(90px);
  opacity: 0.4;
}

/* ── Logo + badge ────────────────────────────────────────────────────────── */
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}
.logo-mark {
  position: relative;
  overflow: hidden;
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
.logo-mark::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 60%);
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

/* ── Card ────────────────────────────────────────────────────────────────── */
.cand-card {
  width: 100%;
  max-width: 480px;
  background: white;
  border: 1px solid #efeee8;
  border-radius: 16px;
  padding: 40px 44px;
  box-shadow: 0 30px 60px -20px rgba(17, 24, 39, 0.1);
  position: relative;
  z-index: 1;
}
.card-head {
  text-align: center;
  margin-bottom: 28px;
}
.card-title {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
}
.card-sub {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: #6b7280;
}

.mb-22 {
  margin-bottom: 22px;
}

/* ── Divider ─────────────────────────────────────────────────────────────── */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #9ca3af;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 22px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

/* ── Alerts ──────────────────────────────────────────────────────────────── */
.form-alert {
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13.5px;
  color: #b91c1c;
  margin-bottom: 14px;
}
.info-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  font-size: 13px;
  color: #3730a3;
  line-height: 1.5;
  margin-bottom: 14px;
}
.alert-close {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #6366f1;
  flex-shrink: 0;
  display: flex;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.forgot-link {
  background: none;
  border: none;
  padding: 0;
  font:
    500 12px 'Inter',
    sans-serif;
  color: #4f46e5;
  cursor: pointer;
}
.forgot-link:hover {
  text-decoration: underline;
}

.mt-22 {
  margin-top: 22px;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.card-foot {
  margin-top: 18px;
  text-align: center;
}
.foot-line {
  font-size: 13px;
  color: #6b7280;
}
.link {
  color: #4f46e5;
  font-weight: 500;
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}

.cross-link {
  margin-top: 28px;
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: #6b7280;
}
</style>
