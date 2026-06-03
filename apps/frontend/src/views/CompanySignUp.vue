<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/plugins/axios'
import type { CompanySize } from '@/types/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

// ── Form state ────────────────────────────────────────────────────────────────
const fullName = ref('')
const email = ref('')
const companyName = ref('')
const size = ref<CompanySize | ''>('')
const industry = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeTerms = ref(false)
const loading = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

const errors = ref({ fullName: '', email: '', companyName: '', password: '', confirmPassword: '', form: '' })
const touched = ref({ fullName: false, email: false, companyName: false, password: false, confirmPassword: false })

// ── Validators ────────────────────────────────────────────────────────────────
function validateFullName() {
  const v = fullName.value.trim()
  if (!v) return 'Name is required'
  if (v.length < 2) return 'Must be at least 2 characters'
  if (v.length > 100) return 'Must be under 100 characters'
  return ''
}
function validateEmail() {
  const v = email.value.trim()
  if (!v) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return ''
}
function validateCompanyName() {
  const v = companyName.value.trim()
  if (!v) return 'Company name is required'
  if (v.length < 2) return 'Must be at least 2 characters'
  return ''
}
function validatePassword() {
  if (!password.value) return 'Password is required'
  if (password.value.length < 8) return 'Must be at least 8 characters'
  if (!/[a-zA-Z]/.test(password.value) || !/[0-9]/.test(password.value))
    return 'Must contain a letter and a number'
  return ''
}
function validateConfirmPassword() {
  if (!confirmPassword.value) return 'Please confirm your password'
  if (confirmPassword.value !== password.value) return 'Passwords do not match'
  return ''
}

function onBlur(field: keyof typeof touched.value) {
  touched.value[field] = true
  if (field === 'fullName') errors.value.fullName = validateFullName()
  else if (field === 'email') errors.value.email = validateEmail()
  else if (field === 'companyName') errors.value.companyName = validateCompanyName()
  else if (field === 'password') errors.value.password = validatePassword()
  else if (field === 'confirmPassword') errors.value.confirmPassword = validateConfirmPassword()
}

function validateAll(): boolean {
  errors.value.fullName = validateFullName()
  errors.value.email = validateEmail()
  errors.value.companyName = validateCompanyName()
  errors.value.password = validatePassword()
  errors.value.confirmPassword = validateConfirmPassword()
  return !errors.value.fullName && !errors.value.email && !errors.value.companyName &&
    !errors.value.password && !errors.value.confirmPassword
}

const isFormValid = computed(() =>
  !validateFullName() && !validateEmail() && !validateCompanyName() &&
  !validatePassword() && !validateConfirmPassword() && agreeTerms.value,
)

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!validateAll() || !agreeTerms.value) return
  errors.value.form = ''
  loading.value = true
  try {
    await authStore.signupCompany({
      fullName: fullName.value.trim(),
      email: email.value.trim().toLowerCase(),
      companyName: companyName.value.trim(),
      size: size.value || undefined,
      industry: industry.value || undefined,
      password: password.value,
    })
    router.push('/dashboard')
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

// ── Options ───────────────────────────────────────────────────────────────────
const sizes: CompanySize[] = ['1-10', '11-50', '51-200', '201-500', '500+']
const industries = [
  'Technology', 'Software / SaaS', 'Healthcare', 'Finance', 'Education',
  'E-commerce', 'Manufacturing', 'Media & Entertainment', 'Consulting', 'Other',
]

// ── Avatar helpers ────────────────────────────────────────────────────────────
function avatarBg(name: string): string {
  const colors = ['#818CF8', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#60A5FA']
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length] ?? '#818CF8'
}
function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
}
const socialProofNames = ['Mei Tanaka', 'Marcus Johnson', 'Priya Sharma', 'Jamie Rivera']
</script>

<template>
  <div class="auth-page">
    <!-- ── Left: Form column ─────────────────────────────────────────────── -->
    <section class="form-col">
      <div class="form-inner">

        <!-- "For Companies" badge -->
        <div>
          <span class="pill pill--indigo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            For Companies
          </span>
        </div>

        <!-- Heading -->
        <div>
          <h1 class="auth-title">Create your workspace</h1>
          <p class="auth-sub">Start hiring smarter in 2&nbsp;minutes. No credit card required for your 14-day trial.</p>
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
        <div class="divider"><span>or with email</span></div>

        <!-- Global form error -->
        <div v-if="errors.form" class="form-alert">{{ errors.form }}</div>

        <!-- Name + Email -->
        <div class="field-row">
          <div class="field">
            <label class="field-label">Your name</label>
            <input
              v-model="fullName"
              class="field-input"
              :class="{ 'field-input--err': touched.fullName && errors.fullName }"
              placeholder="Jamie Rivera"
              autocomplete="name"
              @blur="onBlur('fullName')"
            />
            <span v-if="touched.fullName && errors.fullName" class="field-err">{{ errors.fullName }}</span>
          </div>
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
            />
            <span v-if="touched.email && errors.email" class="field-err">{{ errors.email }}</span>
          </div>
        </div>

        <!-- Company name -->
        <div class="field">
          <label class="field-label">Company name</label>
          <input
            v-model="companyName"
            class="field-input"
            :class="{ 'field-input--err': touched.companyName && errors.companyName }"
            placeholder="Acme Inc."
            autocomplete="organization"
            @blur="onBlur('companyName')"
          />
          <span v-if="touched.companyName && errors.companyName" class="field-err">{{ errors.companyName }}</span>
        </div>

        <!-- Size + Industry -->
        <div class="field-row">
          <div class="field">
            <label class="field-label">Company size</label>
            <div class="select-wrap">
              <select v-model="size" class="field-input field-select">
                <option value="">Select size…</option>
                <option v-for="s in sizes" :key="s" :value="s">{{ s }} employees</option>
              </select>
              <svg class="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div class="field">
            <label class="field-label">Industry</label>
            <div class="select-wrap">
              <select v-model="industry" class="field-input field-select">
                <option value="">Select industry…</option>
                <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
              </select>
              <svg class="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>

        <!-- Password + Confirm -->
        <div class="field-row">
          <div class="field">
            <label class="field-label">Password</label>
            <div class="input-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="field-input field-input--icon"
                :class="{ 'field-input--err': touched.password && errors.password }"
                placeholder="••••••••"
                autocomplete="new-password"
                @blur="onBlur('password')"
              />
              <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
                <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
            <span v-if="touched.password && errors.password" class="field-err">{{ errors.password }}</span>
            <span v-else class="field-hint">8+ chars, including a number</span>
          </div>
          <div class="field">
            <label class="field-label">Confirm password</label>
            <div class="input-wrap">
              <input
                v-model="confirmPassword"
                :type="showConfirm ? 'text' : 'password'"
                class="field-input field-input--icon"
                :class="{ 'field-input--err': touched.confirmPassword && errors.confirmPassword }"
                placeholder="••••••••"
                autocomplete="new-password"
                @blur="onBlur('confirmPassword')"
              />
              <button type="button" class="eye-btn" @click="showConfirm = !showConfirm" tabindex="-1">
                <svg v-if="!showConfirm" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
            <span v-if="touched.confirmPassword && errors.confirmPassword" class="field-err">{{ errors.confirmPassword }}</span>
          </div>
        </div>

        <!-- Terms checkbox -->
        <label class="checkbox-row" @click.prevent="agreeTerms = !agreeTerms">
          <span class="checkbox-box" :class="{ 'checkbox-box--checked': agreeTerms }">
            <svg v-if="agreeTerms" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span>I agree to the <a href="#" class="link" @click.stop>Terms of Service</a> and <a href="#" class="link" @click.stop>Privacy Policy</a>.</span>
        </label>

        <!-- Submit -->
        <button
          class="btn-primary"
          :disabled="!isFormValid || loading"
          @click="handleSubmit"
        >
          <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
          <template v-else>
            Create workspace
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </template>
        </button>

        <p class="auth-foot">
          Already have an account?
          <RouterLink to="/signin" class="link">Sign in</RouterLink>
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
          <h2 class="mkt-h2">Build your dream team with AI.</h2>
          <p class="mkt-sub">
            HireFlow scores every applicant the moment they apply — so your team spends time on the people who actually fit.
          </p>

          <!-- Feature list -->
          <div class="features">
            <div class="feature">
              <div class="feature-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span>AI-powered candidate screening with 94% recruiter agreement</span>
            </div>
            <div class="feature">
              <div class="feature-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span>Drag-and-drop pipeline management across every role</span>
            </div>
            <div class="feature">
              <div class="feature-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span>Hire 3× faster — average time-to-hire drops from 42 to 14 days</span>
            </div>
          </div>

          <!-- Applicant card -->
          <div class="applicant-card">
            <div class="av" :style="{ background: avatarBg('Sarah Chen') }">{{ initials('Sarah Chen') }}</div>
            <div class="av-info">
              <div class="av-name">Sarah Chen</div>
              <div class="av-role">Senior Backend Engineer · just applied</div>
            </div>
            <div class="score-chip">
              <span class="score-dot"></span>92 · Top fit
            </div>
          </div>

          <!-- Social proof -->
          <div class="social">
            <div class="av-stack">
              <div
                v-for="name in socialProofNames"
                :key="name"
                class="av av--sm"
                :style="{ background: avatarBg(name) }"
              >{{ initials(name) }}</div>
            </div>
            <span class="social-txt"><strong>2,400+ teams</strong> hiring on HireFlow</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="mkt-foot">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          SOC 2 Type II · GDPR · Enterprise-ready
        </div>
      </div>

      <!-- Dot-grid overlay -->
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
  padding: 56px 88px;
  overflow-y: auto;
}

.form-inner {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 22px;
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
  background: #EEF2FF;
  color: #4F46E5;
}

/* ── Typography ──────────────────────────────────────────────────────────── */
.auth-title {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: #111827;
}
.auth-sub {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: #6B7280;
}

/* ── Google / social button ──────────────────────────────────────────────── */
.google-wrap {
  position: relative;
  display: flex;
}
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
.social-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
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
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #E5E7EB;
}

/* ── Form alert ──────────────────────────────────────────────────────────── */
.form-alert {
  padding: 12px 14px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  font-size: 13.5px;
  color: #B91C1C;
  line-height: 1.5;
}

/* ── Field layout ────────────────────────────────────────────────────────── */
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

/* ── Input ───────────────────────────────────────────────────────────────── */
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

/* ── Select ──────────────────────────────────────────────────────────────── */
.select-wrap { position: relative; }
.field-select { width: 100%; padding-right: 32px; cursor: pointer; }
.select-chevron {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #9CA3AF;
}

/* ── Password with eye toggle ────────────────────────────────────────────── */
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

/* ── Error / hint text ───────────────────────────────────────────────────── */
.field-err { font-size: 12px; color: #EF4444; }
.field-hint { font-size: 12px; color: #9CA3AF; }

/* ── Checkbox ────────────────────────────────────────────────────────────── */
.checkbox-row {
  display: flex;
  align-items: flex-start;
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
  margin-top: 1px;
  transition: border-color 0.15s, background 0.15s;
}
.checkbox-box--checked {
  background: #4F46E5;
  border-color: #4F46E5;
}

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
  transition: opacity 0.15s, transform 0.1s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.92; }
.btn-primary:active:not(:disabled) { transform: scale(0.99); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.spinner {
  width: 18px;
  height: 18px;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Footer link ─────────────────────────────────────────────────────────── */
.auth-foot {
  text-align: center;
  font-size: 13px;
  color: #6B7280;
  margin: 0;
}
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
  background:
    radial-gradient(circle at 30% 30%, transparent 0, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 1.5px, transparent 1.5px)
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
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
}

.mkt-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 8px;
}
.mkt-h2 {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.15;
}
.mkt-sub {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.6;
  color: rgba(255,255,255,0.82);
}

/* Feature checks */
.features { display: flex; flex-direction: column; gap: 14px; }
.feature { display: flex; gap: 12px; align-items: flex-start; }
.feature-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.feature span { font-size: 14px; line-height: 1.5; }

/* Applicant card */
.applicant-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.10);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 14px 16px;
}
.av-info { flex: 1; min-width: 0; }
.av-name { font-size: 13px; font-weight: 600; }
.av-role { font-size: 11.5px; color: rgba(255,255,255,0.7); margin-top: 2px; }
.score-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16,185,129,0.20);
  color: #A7F3D0;
  border: 1px solid rgba(16,185,129,0.40);
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  white-space: nowrap;
}
.score-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34D399;
}

/* Social proof */
.social { display: flex; align-items: center; gap: 10px; }
.av-stack { display: flex; }
.av-stack .av--sm { margin-left: -8px; }
.av-stack .av--sm:first-child { margin-left: 0; }
.social-txt { font-size: 12px; color: rgba(255,255,255,0.75); }
.social-txt strong { color: white; }

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
.av--sm {
  width: 28px;
  height: 28px;
  font-size: 10px;
  border: 2px solid rgba(255,255,255,0.5);
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
