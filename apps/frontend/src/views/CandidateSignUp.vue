<template>
  <div class="cand-page">
    <!-- Logo + audience badge -->
    <div class="logo">
      <div class="logo-mark">H</div>
      <span>HireFlow</span>
      <span class="pill-emerald">For Job Seekers</span>
    </div>

    <!-- ── Form ──────────────────────────────────────────────────────────────── -->
    <div class="cand-card">
      <div class="card-head">
        <h1 class="card-title">Track your applications<br />in one place.</h1>
        <p class="card-sub">Get notified the moment a company moves you forward.</p>
      </div>

      <!-- Social (OAuth lands in a later phase) -->
      <!-- <SocialButtons class="mb-22" :providers="['google', 'linkedin']" /> -->

      <!-- <div class="divider"><span>or sign up with email</span></div> -->

      <div v-if="errors.form" class="form-alert">{{ errors.form }}</div>

      <div class="fields">
        <AppField
          v-model="fullName"
          label="Full name"
          placeholder="Sarah Chen"
          :error="touched.fullName ? errors.fullName : ''"
          @blur="onBlur('fullName')"
        />
        <AppField
          v-model="email"
          type="email"
          label="Email"
          placeholder="you@email.com"
          autocomplete="email"
          :error="touched.email ? errors.email : ''"
          @blur="onBlur('email')"
        />
        <AppField
          v-model="password"
          type="password"
          label="Password"
          placeholder="••••••••••"
          autocomplete="new-password"
          :error="touched.password ? errors.password : ''"
          @blur="onBlur('password')"
        />
        <AppField
          v-model="linkedinUrl"
          label="LinkedIn URL (optional)"
          placeholder="linkedin.com/in/…"
          :error="touched.linkedinUrl ? errors.linkedinUrl : ''"
          @blur="onBlur('linkedinUrl')"
          @enter="handleSubmit"
        />
      </div>

      <AppButton class="mt-22" block :loading="loading" @click="handleSubmit">
        Create account
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
          Already have an account?
          <RouterLink to="/candidate/signin" class="link">Sign in</RouterLink>
        </div>
        <div class="trust">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10B981"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Free forever. No spam, ever.
        </div>
      </div>
    </div>

    <!-- Cross-link to recruiter signup -->
    <div class="cross-link">
      Hiring at your company?
      <RouterLink to="/signup" class="link">Create a workspace instead →</RouterLink>
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
import axios from 'axios'

const router = useRouter()
const candidateAuth = useCandidateAuthStore()

const fullName = ref('')
const email = ref('')
const password = ref('')
const linkedinUrl = ref('')
const loading = ref(false)

const errors = ref({ fullName: '', email: '', password: '', linkedinUrl: '', form: '' })
const touched = ref({ fullName: false, email: false, password: false, linkedinUrl: false })

function validateFullName() {
  const v = fullName.value.trim()
  if (!v) return 'Name is required'
  if (v.length < 2) return 'Must be at least 2 characters'
  return ''
}
function validateEmail() {
  const v = email.value.trim()
  if (!v) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return ''
}
function validatePassword() {
  if (!password.value) return 'Password is required'
  if (password.value.length < 8) return 'Must be at least 8 characters'
  if (!/[a-zA-Z]/.test(password.value) || !/[0-9]/.test(password.value))
    return 'Must contain a letter and a number'
  return ''
}
function validateLinkedin() {
  const v = linkedinUrl.value.trim()
  if (!v) return '' // optional
  if (!/\.[a-z]{2,}/i.test(v)) return 'Enter a valid URL'
  return ''
}

function onBlur(field: keyof typeof touched.value) {
  touched.value[field] = true
  if (field === 'fullName') errors.value.fullName = validateFullName()
  else if (field === 'email') errors.value.email = validateEmail()
  else if (field === 'password') errors.value.password = validatePassword()
  else if (field === 'linkedinUrl') errors.value.linkedinUrl = validateLinkedin()
}

const isFormValid = computed(
  () => !validateFullName() && !validateEmail() && !validatePassword() && !validateLinkedin(),
)

function validateAll(): boolean {
  errors.value.fullName = validateFullName()
  errors.value.email = validateEmail()
  errors.value.password = validatePassword()
  errors.value.linkedinUrl = validateLinkedin()
  touched.value = { fullName: true, email: true, password: true, linkedinUrl: true }
  return isFormValid.value
}

async function handleSubmit() {
  if (!validateAll()) return
  errors.value.form = ''
  loading.value = true
  try {
    await candidateAuth.signupCandidate({
      fullName: fullName.value.trim(),
      email: email.value.trim().toLowerCase(),
      password: password.value,
      linkedinUrl: linkedinUrl.value.trim() || undefined,
    })
    router.push('/candidate/dashboard')
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) {
        errors.value.email = 'An account with this email already exists'
        touched.value.email = true
      } else if (err.response?.status === 400) {
        const msg = err.response.data?.message
        errors.value.form = Array.isArray(msg) ? msg[0] : msg || 'Validation failed'
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
.cand-card--center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: #6b7280;
}

/* ── Verify-email state ──────────────────────────────────────────────────── */
.verify-mark {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #ecfdf5;
  color: #047857;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
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

/* ── Form alert ──────────────────────────────────────────────────────────── */
.form-alert {
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13.5px;
  color: #b91c1c;
  margin-bottom: 14px;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mt-22 {
  margin-top: 22px;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.card-foot {
  margin-top: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.foot-line {
  font-size: 13px;
  color: #6b7280;
}
.trust {
  font-size: 11.5px;
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
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
