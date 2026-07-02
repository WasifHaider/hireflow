<template>
  <div class="pub-app">
    <!-- Public header (brand only; no auth chrome) -->
    <header class="pub-header">
      <div class="pub-brand">
        <div class="brand-mark" :style="{ background: brandGradient }">
          <img v-if="job?.company.logoUrl" :src="job.company.logoUrl" alt="" class="brand-img" />
          <template v-else>{{ (job?.company.name ?? 'H').charAt(0).toUpperCase() }}</template>
        </div>
        <div>
          <div class="brand-name">{{ job?.company.name ?? 'Careers' }}</div>
          <div class="brand-sub">Careers</div>
        </div>
      </div>
      <div class="powered">Powered by <strong>HireFlow</strong></div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="pub-main">
      <div class="pub-left">
        <div class="sk-line" style="width: 30%; height: 14px" />
        <div class="sk-line" style="width: 70%; height: 34px; margin-top: 18px" />
        <div class="sk-line" style="width: 100%; margin-top: 24px" />
        <div class="sk-line" style="width: 90%" />
        <div class="sk-line" style="width: 95%" />
      </div>
      <aside class="pub-right">
        <div class="hf-card" style="padding: 24px">
          <div class="sk-line" style="width: 60%; height: 18px" />
          <div class="sk-line" style="width: 100%; height: 44px; margin-top: 18px" />
          <div class="sk-line" style="width: 100%; height: 44px; margin-top: 12px" />
        </div>
      </aside>
    </div>

    <!-- Not found / error -->
    <div v-else-if="error || !job" class="pub-notfound">
      <div style="font-size: 40px">🔍</div>
      <h1>Job not found</h1>
      <p class="hf-muted">{{ error ?? 'This posting may have been closed or removed.' }}</p>
    </div>

    <!-- Loaded -->
    <div v-else class="pub-main">
      <!-- Left: job content -->
      <div class="pub-left">
        <div class="breadcrumb">Careers <span>/</span> {{ job.title }}</div>
        <h1 class="job-title">{{ job.title }}</h1>

        <div class="tag-row">
          <span v-if="locationLine" class="tag"><HfIcon name="map" :size="13" />{{ locationLine }}</span>
          <span v-if="employmentLabel" class="tag"><HfIcon name="briefcase" :size="13" />{{ employmentLabel }}</span>
          <span v-if="salaryLine" class="tag">💰 {{ salaryLine }}</span>
          <span class="tag accent">Actively hiring</span>
        </div>

        <section class="job-section">
          <h2>About the role</h2>
          <p class="job-body">{{ job.description }}</p>
        </section>

        <section v-if="job.requirements" class="job-section">
          <h2>What we’re looking for</h2>
          <p class="job-body">{{ job.requirements }}</p>
        </section>
      </div>

      <!-- Right: apply card -->
      <aside class="pub-right">
        <div class="hf-card apply-card">
          <!-- Success state -->
          <div v-if="submitted" class="apply-success">
            <div class="success-badge">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>Application submitted!</h3>
            <p class="hf-muted">
              Thanks for applying to {{ job.title }} at {{ job.company.name }}. We’ll review your
              resume and be in touch.
            </p>
            <RouterLink to="/candidate/signin" class="track-link">
              Track this application →
            </RouterLink>
          </div>

          <!-- Form -->
          <form v-else class="apply-form" @submit.prevent="handleSubmit">
            <h3 class="apply-title">Apply for this role</h3>
            <div class="apply-role">{{ job.title }}</div>

            <div v-if="formError" class="form-alert">{{ formError }}</div>

            <AppField
              v-model="fullName"
              label="Full name"
              placeholder="Sarah Chen"
              autocomplete="name"
              :error="touched.fullName ? errors.fullName : ''"
              @blur="touch('fullName')"
            />
            <AppField
              v-model="email"
              type="email"
              label="Email"
              placeholder="you@email.com"
              autocomplete="email"
              :error="touched.email ? errors.email : ''"
              @blur="touch('email')"
            />
            <AppField v-model="phone" label="Phone (optional)" placeholder="(555) 000-0000" autocomplete="tel" />

            <!-- Resume dropzone -->
            <div class="field">
              <label class="field-label">Resume <span class="req">*</span></label>
              <div
                class="dropzone"
                :class="{ 'has-file': !!resume, 'dz-error': touched.resume && !!errors.resume, dragging }"
                role="button"
                tabindex="0"
                @click="fileInput?.click()"
                @keydown.enter.prevent="fileInput?.click()"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept="application/pdf,.pdf"
                  class="dz-input"
                  @change="onFileChange"
                />
                <template v-if="resume">
                  <HfIcon name="check" :size="18" />
                  <div class="dz-file">
                    <span class="dz-name">{{ resume.name }}</span>
                    <span class="dz-size">{{ prettySize(resume.size) }} · click to replace</span>
                  </div>
                </template>
                <template v-else>
                  <HfIcon name="download" :size="18" />
                  <div class="dz-text">
                    <strong>Drop your resume here, or browse</strong>
                    <span>PDF up to 5 MB</span>
                  </div>
                </template>
              </div>
              <span v-if="touched.resume && errors.resume" class="field-err">{{ errors.resume }}</span>
            </div>

            <AppField v-model="linkedinUrl" label="LinkedIn URL (optional)" placeholder="linkedin.com/in/you" />

            <div class="field">
              <label class="field-label">Why are you interested? (optional)</label>
              <textarea
                v-model="coverLetter"
                class="hf-area"
                rows="3"
                placeholder="A short note to the hiring team…"
                maxlength="5000"
              />
            </div>

            <AppButton type="submit" block :loading="submitting" class="mt-8">
              Submit application
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </AppButton>

            <div class="trust">
              <div><HfIcon name="check" :size="13" /> Your data is shared only with {{ job.company.name }}’s hiring team.</div>
              <div><HfIcon name="clock" :size="13" /> Most candidates hear back within 5 business days.</div>
            </div>
          </form>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import axios from 'axios'
import { usePublicJobStore } from '@/stores/publicJob.store'
import { getApiErrorMessage } from '@/plugins/axios'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ companySlug: string; jobId: string }>()

const store = usePublicJobStore()
const { job, loading, error } = storeToRefs(store)

onMounted(() => store.fetchJob(props.companySlug, props.jobId))

// ── Display helpers ──
const WORK_MODE: Record<string, string> = { REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On-site' }
const EMPLOYMENT: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  TEMPORARY: 'Temporary',
}
const CURRENCY: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', PKR: '₨' }

const brandGradient = computed(() => {
  const c = job.value?.company.brandColor ?? '#4F46E5'
  return `linear-gradient(135deg, ${c}, ${c}cc)`
})
const locationLine = computed(() => {
  if (!job.value) return ''
  const mode = job.value.jobType ? WORK_MODE[job.value.jobType] ?? job.value.jobType : null
  return [job.value.location, mode].filter(Boolean).join(' · ')
})
const employmentLabel = computed(() => {
  const t = job.value?.employmentType
  return t ? EMPLOYMENT[t] ?? t : ''
})
function money(v: number, cur: string | null): string {
  const sym = CURRENCY[cur ?? 'USD'] ?? ''
  return v >= 1000 ? `${sym}${Math.round(v / 1000)}k` : `${sym}${v}`
}
const salaryLine = computed(() => {
  if (!job.value) return ''
  const { salaryMin, salaryMax, salaryCurrency } = job.value
  if (salaryMin && salaryMax) return `${money(salaryMin, salaryCurrency)} — ${money(salaryMax, salaryCurrency)}`
  if (salaryMin) return `From ${money(salaryMin, salaryCurrency)}`
  if (salaryMax) return `Up to ${money(salaryMax, salaryCurrency)}`
  return ''
})

// ── Form state ──
const fullName = ref('')
const email = ref('')
const phone = ref('')
const linkedinUrl = ref('')
const coverLetter = ref('')
const resume = ref<File | null>(null)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const dragging = ref(false)

const submitting = ref(false)
const submitted = ref(false)
const formError = ref('')

const errors = ref({ fullName: '', email: '', resume: '' })
const touched = ref({ fullName: false, email: false, resume: false })

const MAX_BYTES = 5 * 1024 * 1024

function validate() {
  errors.value.fullName = fullName.value.trim().length < 2 ? 'Please enter your full name' : ''
  const e = email.value.trim()
  errors.value.email = !e
    ? 'Email is required'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
      ? 'Enter a valid email address'
      : ''
  if (!resume.value) errors.value.resume = 'A resume is required'
  else if (resume.value.type !== 'application/pdf') errors.value.resume = 'Resume must be a PDF'
  else if (resume.value.size > MAX_BYTES) errors.value.resume = 'Resume must be 5 MB or smaller'
  else errors.value.resume = ''
}
function touch(field: 'fullName' | 'email' | 'resume') {
  touched.value[field] = true
  validate()
}

function setFile(file: File | null) {
  resume.value = file
  touched.value.resume = true
  validate()
}
function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  setFile(files && files[0] ? files[0] : null)
}
function onDrop(e: DragEvent) {
  dragging.value = false
  const files = e.dataTransfer?.files
  if (files && files[0]) setFile(files[0])
}

function prettySize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function handleSubmit() {
  touched.value = { fullName: true, email: true, resume: true }
  validate()
  formError.value = ''
  if (errors.value.fullName || errors.value.email || errors.value.resume || !job.value || !resume.value) {
    return
  }
  submitting.value = true
  try {
    await store.submitApplication({
      jobId: job.value.id,
      fullName: fullName.value.trim(),
      email: email.value.trim().toLowerCase(),
      phone: phone.value.trim() || undefined,
      linkedinUrl: linkedinUrl.value.trim() || undefined,
      coverLetter: coverLetter.value.trim() || undefined,
      resume: resume.value,
    })
    submitted.value = true
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      formError.value = 'You’ve already applied to this role with this email.'
    } else if (axios.isAxiosError(err) && err.response?.status === 422) {
      formError.value = 'We couldn’t read that resume. Please upload a valid PDF.'
    } else {
      formError.value = getApiErrorMessage(err, 'Something went wrong submitting your application.')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.pub-app {
  min-height: 100dvh;
  background: #fbfaf7;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111827;
  -webkit-font-smoothing: antialiased;
}

/* Header */
.pub-header {
  height: 64px;
  background: white;
  border-bottom: 1px solid var(--hf-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
}
.pub-brand { display: flex; align-items: center; gap: 12px; }
.brand-mark {
  width: 36px; height: 36px; border-radius: 9px;
  display: grid; place-items: center; color: white; font-weight: 700; font-size: 15px;
  overflow: hidden;
}
.brand-img { width: 100%; height: 100%; object-fit: cover; }
.brand-name { font-size: 14.5px; font-weight: 600; }
.brand-sub { font-size: 11.5px; color: var(--hf-text-muted); }
.powered { font-size: 12px; color: var(--hf-text-muted); }
.powered strong { color: var(--hf-primary); font-weight: 600; }

/* Main grid */
.pub-main {
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 40px;
  align-items: start;
}

/* Left */
.breadcrumb { font-size: 12.5px; color: var(--hf-text-muted); }
.breadcrumb span { margin: 0 6px; }
.job-title { margin: 12px 0 0; font-size: 34px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.15; }
.tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 11px; border-radius: 8px;
  background: white; border: 1px solid var(--hf-border);
  font-size: 12px; font-weight: 500; color: var(--hf-text);
}
.tag.accent { background: var(--hf-accent-soft); border-color: transparent; color: #047857; }
.job-section { margin-top: 32px; }
.job-section h2 { margin: 0 0 10px; font-size: 17px; font-weight: 600; letter-spacing: -0.015em; }
.job-body { margin: 0; font-size: 14.5px; line-height: 1.7; color: #374151; white-space: pre-line; }

/* Right apply card */
.pub-right { position: sticky; top: 24px; }
.apply-card { padding: 24px; }
.apply-title { margin: 0; font-size: 16px; font-weight: 600; }
.apply-role { font-size: 13px; color: var(--hf-text-muted); margin-top: 2px; margin-bottom: 18px; }
.apply-form { display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 13px; font-weight: 500; color: #374151; }
.field-err { font-size: 12px; color: #ef4444; }
.req { color: #ef4444; }

.form-alert {
  padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; font-size: 13px; color: #b91c1c;
}

/* Dropzone */
.dropzone {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; border: 1.5px dashed var(--hf-border-strong);
  border-radius: 10px; background: var(--hf-surface-alt);
  cursor: pointer; color: var(--hf-text-muted); transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover, .dropzone.dragging { border-color: var(--hf-primary); background: var(--hf-primary-soft); }
.dropzone.has-file { border-style: solid; border-color: var(--hf-accent); color: #047857; background: var(--hf-accent-soft); }
.dropzone.dz-error { border-color: #ef4444; }
.dz-input { display: none; }
.dz-text, .dz-file { display: flex; flex-direction: column; }
.dz-text strong { font-size: 13px; color: var(--hf-text); }
.dz-text span, .dz-size { font-size: 11.5px; }
.dz-name { font-size: 13px; font-weight: 500; color: var(--hf-text); }

/* Cover-letter textarea (matches design .hf-textarea) */
.hf-area {
  width: 100%; border: 1px solid var(--hf-border); border-radius: 9px;
  padding: 10px 12px; font: 14px 'Inter', sans-serif; color: #111827;
  resize: vertical; background: white; transition: box-shadow 0.15s, border-color 0.15s;
}
.hf-area:focus { outline: none; border-color: var(--hf-primary); box-shadow: 0 0 0 3px var(--hf-primary-soft); }
.hf-area::placeholder { color: #9ca3af; }

.mt-8 { margin-top: 8px; }
.trust { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.trust div { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--hf-text-muted); }

/* Success */
.apply-success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12px 4px; }
.success-badge {
  width: 52px; height: 52px; border-radius: 50%; background: var(--hf-accent-soft);
  color: #047857; display: grid; place-items: center; margin-bottom: 14px;
}
.apply-success h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
.apply-success p { margin: 0; font-size: 13px; line-height: 1.6; }
.track-link { margin-top: 16px; font-size: 13px; font-weight: 500; color: var(--hf-primary); text-decoration: none; }
.track-link:hover { text-decoration: underline; }

/* Not found */
.pub-notfound { max-width: 1080px; margin: 0 auto; padding: 100px 32px; text-align: center; }
.pub-notfound h1 { margin: 12px 0 6px; font-size: 24px; font-weight: 600; }

/* Skeleton */
.sk-line {
  height: 12px; border-radius: 6px; margin-top: 10px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%; animation: sk 1.4s ease infinite;
}
@keyframes sk { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

@media (max-width: 860px) {
  .pub-main { grid-template-columns: 1fr; }
  .pub-right { position: static; }
}
</style>
