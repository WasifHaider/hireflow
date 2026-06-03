<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/plugins/axios'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const keepSignedIn = ref(false)
const loading = ref(false)
const showPassword = ref(false)
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
  return name.split(' ').filter(Boolean).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
}
</script>

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
        <div style="margin-top: 12px;">
          <h1 class="auth-title">Welcome back.</h1>
          <p class="auth-sub">Sign in to your workspace to keep hiring.</p>
        </div>

        <!-- Google (disabled) -->
        <div class="google-wrap">
          <button class="social-btn" disabled>
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.4 39.6 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.5C41.7 35.8 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <span class="soon-badge">Soon</span>
        </div>

        <!-- Divider -->
        <div class="divider"><span>or</span></div>

        <!-- Forgot password info alert -->
        <div v-if="showForgotAlert" class="info-alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Password reset coming soon. Contact support if you're locked out.
          <button class="alert-close" @click="showForgotAlert = false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Form error -->
        <div v-if="errors.form" class="form-alert">{{ errors.form }}</div>

        <!-- Email -->
        <div class="field">
          <label class="field-label">Work email</label>
          <input
            v-model="email"
            type="email"
            class="field-input"
            :class="{ 'field-input--err': touched.email && errors.email }"
            placeholder="jamie@acme.com"
            autocomplete="email"
            @blur="onBlur('email')"
            @keyup.enter="handleSubmit"
          />
          <span v-if="touched.email && errors.email" class="field-err">{{ errors.email }}</span>
        </div>

        <!-- Password -->
        <div class="field">
          <div class="field-label-row">
            <label class="field-label">Password</label>
            <button type="button" class="forgot-link" @click="handleForgotPassword">Forgot password?</button>
          </div>
          <div class="input-wrap">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="field-input field-input--icon"
              :class="{ 'field-input--err': touched.password && errors.password }"
              placeholder="••••••••"
              autocomplete="current-password"
              @blur="onBlur('password')"
              @keyup.enter="handleSubmit"
            />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
              <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
          <span v-if="touched.password && errors.password" class="field-err">{{ errors.password }}</span>
        </div>

        <!-- Keep signed in -->
        <label class="checkbox-row" @click.prevent="keepSignedIn = !keepSignedIn">
          <span class="checkbox-box" :class="{ 'checkbox-box--checked': keepSignedIn }">
            <svg v-if="keepSignedIn" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span>Keep me signed in on this device</span>
        </label>

        <!-- Submit -->
        <button class="btn-primary" :disabled="loading" @click="handleSubmit">
          <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
          <template v-else>
            Sign in to workspace
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </template>
        </button>

        <p class="auth-foot">
          New to HireFlow?
          <RouterLink to="/signup" class="link">Create a workspace</RouterLink>
        </p>
        <p class="auth-foot" style="margin-top: -10px;">
          Looking to apply for a job?
          <a href="#" class="link">Candidate sign in</a>
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
              HireFlow cut our screening time by 80%. The AI ranks candidates better than our senior recruiters — and it never has a bad Monday.
            </p>
            <div class="quote-author">
              <div class="av" :style="{ background: avatarBg('Maya Okafor') }">{{ initials('Maya Okafor') }}</div>
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          SOC 2 Type II · GDPR · Enterprise-ready
        </div>
      </div>
      <div class="dot-grid" aria-hidden="true"></div>
    </aside>
  </div>
</template>

<style scoped>
/* ── Page shell ──────────────────────────────────────────────────────────── */
.auth-page {
  display: grid;
  grid-template-columns: 60% 40%;
  min-height: 100dvh;
  background: white;
  font-family: 'Inter', -apple-system, sans-serif;
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
  background: #4F46E5;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
}
.logo-text { font-size: 15px; font-weight: 600; color: #111827; }

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
.pill--indigo { background: #EEF2FF; color: #4F46E5; }

/* ── Typography ──────────────────────────────────────────────────────────── */
.auth-title {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: #111827;
}
.auth-sub { margin: 6px 0 0; font-size: 14px; color: #6B7280; }

/* ── Google button ───────────────────────────────────────────────────────── */
.google-wrap { position: relative; display: flex; }
.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 44px;
  border-radius: 9px;
  background: white;
  border: 1px solid #E5E7EB;
  font: 500 13.5px 'Inter', sans-serif;
  color: #111827;
  cursor: pointer;
}
.social-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.soon-badge {
  position: absolute;
  top: -8px;
  right: -6px;
  background: #6B7280;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 99px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── Divider ─────────────────────────────────────────────────────────────── */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #9CA3AF;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #E5E7EB; }

/* ── Alerts ──────────────────────────────────────────────────────────────── */
.form-alert {
  padding: 12px 14px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  font-size: 13.5px;
  color: #B91C1C;
}
.info-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #EEF2FF;
  border: 1px solid #C7D2FE;
  border-radius: 8px;
  font-size: 13px;
  color: #3730A3;
  line-height: 1.5;
}
.alert-close {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #6366F1;
  flex-shrink: 0;
  display: flex;
}

/* ── Fields ──────────────────────────────────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 13px; font-weight: 500; color: #374151; }
.field-label-row {
  display: flex;
  align-items: center;
}
.forgot-link {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0;
  font: 500 12px 'Inter', sans-serif;
  color: #4F46E5;
  cursor: pointer;
}
.forgot-link:hover { text-decoration: underline; }

.field-input {
  height: 44px;
  border: 1px solid #E5E7EB;
  border-radius: 9px;
  padding: 0 14px;
  font: 14px 'Inter', sans-serif;
  color: #111827;
  background: white;
  outline: none;
  transition: border-color 0.15s;
  appearance: none;
  -webkit-appearance: none;
}
.field-input::placeholder { color: #9CA3AF; }
.field-input:focus { border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.field-input--err { border-color: #EF4444 !important; }
.field-input--err:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important; }

.input-wrap { position: relative; }
.field-input--icon { padding-right: 40px; width: 100%; }
.eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #9CA3AF;
  display: flex;
  align-items: center;
}
.eye-btn:hover { color: #6B7280; }

.field-err { font-size: 12px; color: #EF4444; }

/* ── Checkbox ────────────────────────────────────────────────────────────── */
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}
.checkbox-box {
  width: 16px;
  height: 16px;
  border: 1.5px solid #D1D5DB;
  border-radius: 4px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: white;
  transition: border-color 0.15s, background 0.15s;
}
.checkbox-box--checked { background: #4F46E5; border-color: #4F46E5; }

/* ── Primary button ──────────────────────────────────────────────────────── */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  width: 100%;
  background: linear-gradient(180deg, #4F46E5, #4338CA);
  color: white;
  border: none;
  border-radius: 9px;
  font: 600 14px 'Inter', sans-serif;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 3px rgba(79,70,229,0.4);
  transition: opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.92; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.spinner { width: 18px; height: 18px; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Footer links ────────────────────────────────────────────────────────── */
.auth-foot { text-align: center; font-size: 13px; color: #6B7280; margin: 0; }
.link { color: #4F46E5; font-weight: 500; text-decoration: none; }
.link:hover { text-decoration: underline; }

/* ── Marketing column ────────────────────────────────────────────────────── */
.mkt-col {
  position: relative;
  background:
    radial-gradient(800px 500px at 80% 0%, rgba(99,102,241,0.35), transparent 60%),
    radial-gradient(700px 400px at 0% 100%, rgba(167,139,250,0.30), transparent 60%),
    linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #6366F1 100%);
  color: white;
  overflow: hidden;
  display: flex;
}
.dot-grid {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, transparent 0, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 1.5px, transparent 1.5px) 0 0 / 24px 24px;
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
.mkt-logo { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; }
.mkt-logo-mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
}
.mkt-body { display: flex; flex-direction: column; gap: 28px; flex: 1; justify-content: center; }

/* Testimonial card */
.testimonial-card {
  background: rgba(255,255,255,0.10);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.quote-mark { font-size: 38px; line-height: 1; opacity: 0.6; font-family: Georgia, serif; }
.quote-text { margin: 0; font-size: 16px; line-height: 1.55; letter-spacing: -0.01em; }
.quote-author { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.author-meta { flex: 1; }
.author-name { font-size: 13.5px; font-weight: 600; }
.author-role { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 1px; }
.author-metric { display: flex; flex-direction: column; align-items: flex-end; }
.metric-value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}
.metric-label {
  font-size: 10.5px;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* Stats row */
.stats-row { display: flex; gap: 28px; }
.stat-value {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.stat-label {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
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
  border: 2px solid rgba(255,255,255,0.3);
}

/* Marketing footer */
.mkt-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(255,255,255,0.65);
}
</style>
