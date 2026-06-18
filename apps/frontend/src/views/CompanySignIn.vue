<template>
  <div class="auth-page">
    <!-- ── Left: Form column ─────────────────────────────────────────────── -->
    <section class="form-col">
      <div class="form-inner">
        <!-- Logo + badge -->
        <div class="brand-row">
          <div class="logo">
            <div class="logo-mark">H</div>
            <span class="logo-text">HireFlow</span>
          </div>
          <span class="pill pill--indigo">For Companies</span>
        </div>

        <!-- Heading -->
        <div style="margin-top: 12px">
          <h1 class="auth-title">Welcome back.</h1>
          <p class="auth-sub">Sign in to your workspace to keep hiring.</p>
        </div>

        <!-- Google (disabled, OAuth lands later) -->
        <SocialButtons :providers="['google']" soon />

        <!-- Divider -->
        <div class="divider"><span>or</span></div>

        <!-- Forgot password info alert -->
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
          Password reset coming soon. Contact support if you're locked out.
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

        <!-- Form error -->
        <div v-if="errors.form" class="form-alert">{{ errors.form }}</div>

        <!-- Email -->
        <AppField
          v-model="email"
          type="email"
          label="Work email"
          placeholder="jamie@acme.com"
          autocomplete="email"
          :error="touched.email ? errors.email : ''"
          @blur="onBlur('email')"
          @enter="handleSubmit"
        />

        <!-- Password -->
        <AppField
          v-model="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          autocomplete="current-password"
          :error="touched.password ? errors.password : ''"
          @blur="onBlur('password')"
          @enter="handleSubmit"
        >
          <template #label-action>
            <button type="button" class="forgot-link" @click="handleForgotPassword">
              Forgot password?
            </button>
          </template>
        </AppField>

        <!-- Keep signed in -->
        <AppCheckbox v-model="keepSignedIn">Keep me signed in on this device</AppCheckbox>

        <!-- Submit -->
        <AppButton block :loading="loading" @click="handleSubmit">
          Sign in to workspace
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

        <p class="auth-foot">
          New to HireFlow?
          <RouterLink to="/signup" class="link">Create a workspace</RouterLink>
        </p>
        <p class="auth-foot" style="margin-top: -10px">
          Looking to apply for a job?
          <RouterLink to="/candidate/signin" class="link">Candidate sign in</RouterLink>
        </p>
      </div>
    </section>

    <!-- ── Right: Marketing panel ─────────────────────────────────────────── -->
    <aside class="mkt-col">
      <div class="mkt-inner">
        <!-- Logo -->
        <div class="mkt-logo">
          <div class="mkt-logo-mark">H</div>
          <span>HireFlow</span>
        </div>

        <div class="mkt-body">
          <!-- Testimonial card -->
          <div class="testimonial-card">
            <div class="quote-mark">"</div>
            <p class="quote-text">
              HireFlow cut our screening time by 80%. The AI ranks candidates better than our senior
              recruiters — and it never has a bad Monday.
            </p>
            <div class="quote-author">
              <div class="av" :style="{ background: avatarBg('Maya Okafor') }">
                {{ initials('Maya Okafor') }}
              </div>
              <div class="author-meta">
                <div class="author-name">Maya Okafor</div>
                <div class="author-role">Head of Talent · Lumen Health</div>
              </div>
              <div class="author-metric">
                <div class="metric-value">−68%</div>
                <div class="metric-label">Time to hire</div>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <div class="stat">
              <div class="stat-value">2,400+</div>
              <div class="stat-label">Active teams</div>
            </div>
            <div class="stat">
              <div class="stat-value">1.2M</div>
              <div class="stat-label">Candidates screened</div>
            </div>
            <div class="stat">
              <div class="stat-value">94%</div>
              <div class="stat-label">AI agreement</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mkt-foot">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          SOC 2 Type II · GDPR · Enterprise-ready
        </div>
      </div>
      <div class="dot-grid" aria-hidden="true"></div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/plugins/axios'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCheckbox from '@/components/common/AppCheckbox.vue'
import SocialButtons from '@/components/common/SocialButtons.vue'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const keepSignedIn = ref(false)
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
    await authStore.signin({ email: email.value.trim().toLowerCase(), password: password.value })
    router.push('/dashboard')
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      errors.value.form = 'Invalid email or password.'
    } else {
      errors.value.form = getApiErrorMessage(err)
    }
  } finally {
    loading.value = false
  }
}

function handleForgotPassword() {
  showForgotAlert.value = true
}

function avatarBg(name: string): string {
  const colors = ['#818CF8', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#60A5FA']
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length] ?? '#818CF8'
}
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
</script>

<style scoped>
/* ── Page shell ──────────────────────────────────────────────────────────── */
.auth-page {
  display: grid;
  grid-template-columns: 60% 40%;
  min-height: 100dvh;
  background: white;
  font-family:
    'Inter',
    -apple-system,
    sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Form column ─────────────────────────────────────────────────────────── */
.form-col {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 120px;
  overflow-y: auto;
}
.form-inner {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Brand row ───────────────────────────────────────────────────────────── */
.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  text-decoration: none;
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
.logo-text {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

/* ── Pill badge ──────────────────────────────────────────────────────────── */
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.pill--indigo {
  background: #eef2ff;
  color: #4f46e5;
}

/* ── Typography ──────────────────────────────────────────────────────────── */
.auth-title {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: #111827;
}
.auth-sub {
  margin: 6px 0 0;
  font-size: 14px;
  color: #6b7280;
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

/* ── Forgot-password link (rendered into AppField's #label-action slot) ────── */
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

/* ── Footer links ────────────────────────────────────────────────────────── */
.auth-foot {
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}
.link {
  color: #4f46e5;
  font-weight: 500;
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}

/* ── Marketing column ────────────────────────────────────────────────────── */
.mkt-col {
  position: relative;
  background:
    radial-gradient(800px 500px at 80% 0%, rgba(99, 102, 241, 0.35), transparent 60%),
    radial-gradient(700px 400px at 0% 100%, rgba(167, 139, 250, 0.3), transparent 60%),
    linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #6366f1 100%);
  color: white;
  overflow: hidden;
  display: flex;
}
.dot-grid {
  position: absolute;
  inset: 0;
  background: radial-gradient(
      circle at 30% 30%,
      transparent 0,
      transparent 1px,
      rgba(255, 255, 255, 0.05) 1px,
      rgba(255, 255, 255, 0.05) 1.5px,
      transparent 1.5px
    )
    0 0 / 24px 24px;
  opacity: 0.5;
  pointer-events: none;
}
.mkt-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 56px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.mkt-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
}
.mkt-logo-mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
}
.mkt-body {
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
  justify-content: center;
}

/* Testimonial card */
.testimonial-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.quote-mark {
  font-size: 38px;
  line-height: 1;
  opacity: 0.6;
  font-family: Georgia, serif;
}
.quote-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.55;
  letter-spacing: -0.01em;
}
.quote-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.author-meta {
  flex: 1;
}
.author-name {
  font-size: 13.5px;
  font-weight: 600;
}
.author-role {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 1px;
}
.author-metric {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.metric-value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}
.metric-label {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* Stats row */
.stats-row {
  display: flex;
  gap: 28px;
}
.stat-value {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* Avatar */
.av {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

/* Marketing footer */
.mkt-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.65);
}
</style>
