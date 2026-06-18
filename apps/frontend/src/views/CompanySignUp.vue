<template>
  <div class="auth-page">
    <!-- ── Left: Form column ─────────────────────────────────────────────── -->
    <section class="form-col">
      <div class="form-inner">
        <!-- "For Companies" badge -->
        <div>
          <span class="pill pill--indigo">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            For Companies
          </span>
        </div>

        <!-- Heading -->
        <div>
          <h1 class="auth-title">Create your workspace</h1>
          <p class="auth-sub">
            Start hiring smarter in 2&nbsp;minutes. No credit card required for your 14-day trial.
          </p>
        </div>

        <!-- Google (disabled, OAuth lands later) -->
        <SocialButtons :providers="['google']" soon />

        <!-- Divider -->
        <div class="divider"><span>or with email</span></div>

        <!-- Global form error -->
        <div v-if="errors.form" class="form-alert">{{ errors.form }}</div>

        <!-- Name + Email -->
        <div class="field-row">
          <AppField
            v-model="fullName"
            label="Your name"
            placeholder="Jamie Rivera"
            :error="touched.fullName ? errors.fullName : ''"
            @blur="onBlur('fullName')"
          />
          <AppField
            v-model="email"
            type="email"
            label="Work email"
            placeholder="jamie@acme.com"
            :error="touched.email ? errors.email : ''"
            @blur="onBlur('email')"
          />
        </div>

        <!-- Company name -->
        <AppField
          v-model="companyName"
          label="Company name"
          placeholder="Acme Inc."
          :error="touched.companyName ? errors.companyName : ''"
          @blur="onBlur('companyName')"
        />

        <!-- Size + Industry -->
        <div class="field-row">
          <AppField
            v-model="size"
            type="select"
            label="Company size"
            placeholder="Select Your Size"
            :items="sizes"
          />
          <AppField
            v-model="industry"
            type="autocomplete"
            label="Industry"
            placeholder="Select Your Industry"
            :items="industries"
          />
        </div>

        <!-- Password + Confirm -->
        <div class="field-row">
          <AppField
            v-model="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autocomplete="new-password"
            :error="touched.password ? errors.password : ''"
            @blur="onBlur('password')"
          />
          <AppField
            v-model="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="••••••••"
            autocomplete="new-password"
            :error="touched.confirmPassword ? errors.confirmPassword : ''"
            @blur="onBlur('confirmPassword')"
          />
        </div>

        <!-- Terms checkbox -->
        <AppCheckbox v-model="agreeTerms">
          I agree to the <a href="#" @click.stop>Terms of Service</a> and
          <a href="#" @click.stop>Privacy Policy</a>.
        </AppCheckbox>

        <!-- Submit -->
        <AppButton block :disabled="!isFormValid" :loading="loading" @click="handleSubmit">
          Create workspace
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
            HireFlow scores every applicant the moment they apply — so your team spends time on the
            people who actually fit.
          </p>

          <!-- Feature list -->
          <div class="features">
            <div class="feature">
              <div class="feature-check">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>AI-powered candidate screening with 94% recruiter agreement</span>
            </div>
            <div class="feature">
              <div class="feature-check">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Drag-and-drop pipeline management across every role</span>
            </div>
            <div class="feature">
              <div class="feature-check">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Hire 3× faster — average time-to-hire drops from 42 to 14 days</span>
            </div>
          </div>

          <!-- Applicant card -->
          <div class="applicant-card">
            <div class="av" :style="{ background: avatarBg('Sarah Chen') }">
              {{ initials('Sarah Chen') }}
            </div>
            <div class="av-info">
              <div class="av-name">Sarah Chen</div>
              <div class="av-role">Senior Backend Engineer · just applied</div>
            </div>
            <div class="score-chip"><span class="score-dot"></span>92 · Top fit</div>
          </div>

          <!-- Social proof -->
          <div class="social">
            <div class="av-stack">
              <div
                v-for="name in socialProofNames"
                :key="name"
                class="av av--sm"
                :style="{ background: avatarBg(name) }"
              >
                {{ initials(name) }}
              </div>
            </div>
            <span class="social-txt"><strong>2,400+ teams</strong> hiring on HireFlow</span>
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

      <!-- Dot-grid overlay -->
      <div class="dot-grid" aria-hidden="true"></div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/plugins/axios'
import type { CompanySize } from '@/types/auth'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCheckbox from '@/components/common/AppCheckbox.vue'
import SocialButtons from '@/components/common/SocialButtons.vue'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

// ── Form state ────────────────────────────────────────────────────────────────
const fullName = ref('')
const email = ref('')
const companyName = ref('')
const size = ref<CompanySize | null>(null)
const industry = ref(null)
const password = ref('')
const confirmPassword = ref('')
const agreeTerms = ref(false)
const loading = ref(false)

const errors = ref({
  fullName: '',
  email: '',
  companyName: '',
  password: '',
  confirmPassword: '',
  form: '',
})
const touched = ref({
  fullName: false,
  email: false,
  companyName: false,
  password: false,
  confirmPassword: false,
})

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
  return (
    !errors.value.fullName &&
    !errors.value.email &&
    !errors.value.companyName &&
    !errors.value.password &&
    !errors.value.confirmPassword
  )
}

const isFormValid = computed(
  () =>
    !validateFullName() &&
    !validateEmail() &&
    !validateCompanyName() &&
    !validatePassword() &&
    !validateConfirmPassword() &&
    agreeTerms.value,
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
    router.push('/welcome')
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
  'Technology',
  'Software / SaaS',
  'Healthcare',
  'Finance',
  'Education',
  'E-commerce',
  'Manufacturing',
  'Media & Entertainment',
  'Consulting',
  'Other',
]

// ── Avatar helpers ────────────────────────────────────────────────────────────
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
const socialProofNames = ['Mei Tanaka', 'Marcus Johnson', 'Priya Sharma', 'Jamie Rivera']
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
  background: #eef2ff;
  color: #4f46e5;
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

/* ── Form alert ──────────────────────────────────────────────────────────── */
.form-alert {
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13.5px;
  color: #b91c1c;
  line-height: 1.5;
}

/* ── Field layout ────────────────────────────────────────────────────────── */
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* ── Footer link ─────────────────────────────────────────────────────────── */
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
  color: rgba(255, 255, 255, 0.82);
}

/* Feature checks */
.features {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.feature {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.feature-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.feature span {
  font-size: 14px;
  line-height: 1.5;
}

/* Applicant card */
.applicant-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
}
.av-info {
  flex: 1;
  min-width: 0;
}
.av-name {
  font-size: 13px;
  font-weight: 600;
}
.av-role {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}
.score-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.2);
  color: #a7f3d0;
  border: 1px solid rgba(16, 185, 129, 0.4);
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
  background: #34d399;
}

/* Social proof */
.social {
  display: flex;
  align-items: center;
  gap: 10px;
}
.av-stack {
  display: flex;
}
.av-stack .av--sm {
  margin-left: -8px;
}
.av-stack .av--sm:first-child {
  margin-left: 0;
}
.social-txt {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}
.social-txt strong {
  color: white;
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
.av--sm {
  width: 28px;
  height: 28px;
  font-size: 10px;
  border: 2px solid rgba(255, 255, 255, 0.5);
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
