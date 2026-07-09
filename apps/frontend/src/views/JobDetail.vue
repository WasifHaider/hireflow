<template>
  <div class="jd">
    <RouterLink to="/candidate/jobs" class="jd-back">
      <HfIcon name="chevronLeft" :size="15" /> Back to jobs
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="jd-grid">
      <div class="jd-left">
        <div class="sk-line" style="width: 30%; height: 14px" />
        <div class="sk-line" style="width: 70%; height: 32px; margin-top: 16px" />
        <div class="sk-line" style="width: 100%; margin-top: 24px" />
        <div class="sk-line" style="width: 92%" />
      </div>
      <aside class="jd-right">
        <div class="hf-card" style="padding: 24px">
          <div class="sk-line" style="width: 60%; height: 18px" />
          <div class="sk-line" style="width: 100%; height: 44px; margin-top: 18px" />
        </div>
      </aside>
    </div>

    <!-- Not found -->
    <div v-else-if="error || !job" class="jd-notfound">
      <div style="font-size: 38px">🔍</div>
      <h1>Job not found</h1>
      <p class="hf-muted">{{ error ?? 'This posting may have been closed or removed.' }}</p>
    </div>

    <!-- Loaded -->
    <div v-else class="jd-grid">
      <!-- Left: content -->
      <div class="jd-left">
        <div class="jd-brand">
          <div class="jd-mark" :style="{ background: brandGradient(job.company.brandColor) }">
            <img v-if="job.company.logoUrl" :src="job.company.logoUrl" alt="" class="jd-mark-img" />
            <template v-else>{{ job.company.name.charAt(0).toUpperCase() }}</template>
          </div>
          <span class="jd-company">{{ job.company.name }}</span>
        </div>

        <h1 class="jd-title">{{ job.title }}</h1>

        <div class="jd-tags">
          <span v-if="locationLine" class="jd-tag"><HfIcon name="map" :size="13" />{{ locationLine }}</span>
          <span v-if="employment" class="jd-tag"><HfIcon name="briefcase" :size="13" />{{ employment }}</span>
          <span v-if="salary" class="jd-tag">💰 {{ salary }}</span>
        </div>

        <section class="jd-section">
          <h2>About the role</h2>
          <p class="jd-body">{{ job.description }}</p>
        </section>

        <section v-if="job.requirements" class="jd-section">
          <h2>What we’re looking for</h2>
          <p class="jd-body">{{ job.requirements }}</p>
        </section>
      </div>

      <!-- Right: apply card -->
      <aside class="jd-right">
        <div class="hf-card apply-card">
          <!-- Already applied -->
          <div v-if="alreadyApplied" class="apply-info">
            <div class="info-badge"><HfIcon name="check" :size="22" /></div>
            <h3>You’ve already applied</h3>
            <p class="hf-muted">Track the status of this application from My Applications.</p>
            <RouterLink to="/candidate/dashboard" class="track-link">View my applications →</RouterLink>
          </div>

          <!-- Success -->
          <div v-else-if="submitted" class="apply-info">
            <div class="info-badge"><HfIcon name="check" :size="22" /></div>
            <h3>Application submitted!</h3>
            <p class="hf-muted">
              Thanks for applying to {{ job.title }} at {{ job.company.name }}. We’ll be in touch.
            </p>
            <RouterLink to="/candidate/dashboard" class="track-link">Track this application →</RouterLink>
          </div>

          <!-- Form -->
          <form v-else class="apply-form" @submit.prevent="handleSubmit">
            <h3 class="apply-title">Apply for this role</h3>
            <div class="apply-role">{{ job.title }}</div>

            <div v-if="formError" class="form-alert">{{ formError }}</div>

            <!-- Applying as (identity comes from your account) -->
            <div class="identity">
              <div class="identity-avatar">{{ initials }}</div>
              <div class="identity-meta">
                <span class="identity-name">{{ candidateName || 'Your account' }}</span>
                <span class="identity-email">{{ candidateEmail }}</span>
              </div>
            </div>

            <!-- Resume dropzone -->
            <div class="field">
              <label class="field-label">Resume <span class="req">*</span></label>
              <div
                class="dropzone"
                :class="{ 'has-file': !!resume, 'dz-error': !!resumeError, dragging }"
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
              <span v-if="resumeError" class="field-err">{{ resumeError }}</span>
            </div>

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
            </AppButton>

            <div class="trust">
              <div><HfIcon name="check" :size="13" /> Shared only with {{ job.company.name }}’s hiring team.</div>
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
import { useCandidateApplicationsStore } from '@/stores/candidateApplications.store'
import { useCandidateAuthStore } from '@/stores/candidateAuth.store'
import { getApiErrorMessage } from '@/plugins/axios'
import { brandGradient, employmentLabel, salaryLine, workModeLabel } from '@/utils/jobFormat'
import AppButton from '@/components/common/AppButton.vue'
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ companySlug: string; jobId: string }>()

const store = usePublicJobStore()
const { job, loading, error } = storeToRefs(store)

const appsStore = useCandidateApplicationsStore()
const { appliedJobIds } = storeToRefs(appsStore)

const candidateAuth = useCandidateAuthStore()
const candidateName = computed(() => candidateAuth.candidate?.fullName ?? '')
const candidateEmail = computed(() => candidateAuth.candidate?.email ?? '')
const initials = computed(() => (candidateName.value || 'U').charAt(0).toUpperCase())

onMounted(() => {
  store.fetchJob(props.companySlug, props.jobId)
  // Needed so we can tell whether the candidate already applied to this job.
  if (!appsStore.applications.length) appsStore.fetchApplications()
})

const alreadyApplied = computed(() => appliedJobIds.value.has(props.jobId))

// ── Display ──
const locationLine = computed(() => {
  if (!job.value) return ''
  return [job.value.location, workModeLabel(job.value.jobType)].filter(Boolean).join(' · ')
})
const employment = computed(() => employmentLabel(job.value?.employmentType ?? null))
const salary = computed(() =>
  job.value ? salaryLine(job.value.salaryMin, job.value.salaryMax, job.value.salaryCurrency) : '',
)

// ── Apply form ──
const resume = ref<File | null>(null)
const coverLetter = ref('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const dragging = ref(false)
const resumeError = ref('')
const formError = ref('')
const submitting = ref(false)
const submitted = ref(false)

const MAX_BYTES = 5 * 1024 * 1024

function validateResume(): boolean {
  if (!resume.value) resumeError.value = 'A resume is required'
  else if (resume.value.type !== 'application/pdf') resumeError.value = 'Resume must be a PDF'
  else if (resume.value.size > MAX_BYTES) resumeError.value = 'Resume must be 5 MB or smaller'
  else resumeError.value = ''
  return !resumeError.value
}
function setFile(file: File | null) {
  resume.value = file
  validateResume()
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
  formError.value = ''
  if (!validateResume() || !job.value || !resume.value) return
  submitting.value = true
  try {
    await appsStore.applyToJob({
      jobId: job.value.id,
      coverLetter: coverLetter.value.trim() || undefined,
      resume: resume.value,
    })
    submitted.value = true
    // Refresh so the dashboard + already-applied state reflect the new row.
    appsStore.fetchApplications()
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      formError.value = 'You’ve already applied to this role.'
    } else if (axios.isAxiosError(err) && err.response?.status === 404) {
      formError.value = 'This role is no longer accepting applications.'
    } else {
      formError.value = getApiErrorMessage(err, 'Something went wrong submitting your application.')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.jd {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.jd-back {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  font-weight: 500;
  color: var(--hf-text-muted);
  text-decoration: none;
  width: fit-content;
}
.jd-back:hover {
  color: var(--hf-text);
}

.jd-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 36px;
  align-items: start;
}

/* Left */
.jd-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.jd-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 14px;
  overflow: hidden;
}
.jd-mark-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.jd-company {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--hf-text-muted);
}
.jd-title {
  margin: 14px 0 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--hf-text);
}
.jd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.jd-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border-radius: 8px;
  background: white;
  border: 1px solid var(--hf-border);
  font-size: 12px;
  font-weight: 500;
  color: var(--hf-text);
}
.jd-section {
  margin-top: 30px;
}
.jd-section h2 {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--hf-text);
}
.jd-body {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.7;
  color: #374151;
  white-space: pre-line;
}

/* Right apply card */
.jd-right {
  position: sticky;
  top: 24px;
}
.apply-card {
  padding: 22px;
}
.apply-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--hf-text);
}
.apply-role {
  font-size: 13px;
  color: var(--hf-text-muted);
  margin: 2px 0 16px;
}
.apply-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.identity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--hf-border);
  border-radius: 10px;
  background: var(--hf-bg);
}
.identity-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--hf-primary);
  color: white;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
}
.identity-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.identity-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--hf-text);
}
.identity-email {
  font-size: 12px;
  color: var(--hf-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
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
.field-err {
  font-size: 12px;
  color: #ef4444;
}
.req {
  color: #ef4444;
}
.form-alert {
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13px;
  color: #b91c1c;
}

/* Dropzone (mirrors the public careers page) */
.dropzone {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1.5px dashed var(--hf-border-strong);
  border-radius: 10px;
  background: var(--hf-surface-alt);
  cursor: pointer;
  color: var(--hf-text-muted);
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--hf-primary);
  background: var(--hf-primary-soft);
}
.dropzone.has-file {
  border-style: solid;
  border-color: var(--hf-accent);
  color: #047857;
  background: var(--hf-accent-soft);
}
.dropzone.dz-error {
  border-color: #ef4444;
}
.dz-input {
  display: none;
}
.dz-text,
.dz-file {
  display: flex;
  flex-direction: column;
}
.dz-text strong {
  font-size: 13px;
  color: var(--hf-text);
}
.dz-text span,
.dz-size {
  font-size: 11.5px;
}
.dz-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--hf-text);
}

.hf-area {
  width: 100%;
  border: 1px solid var(--hf-border);
  border-radius: 9px;
  padding: 10px 12px;
  font: 14px 'Inter', sans-serif;
  color: #111827;
  resize: vertical;
  background: white;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.hf-area:focus {
  outline: none;
  border-color: var(--hf-primary);
  box-shadow: 0 0 0 3px var(--hf-primary-soft);
}
.hf-area::placeholder {
  color: #9ca3af;
}

.mt-8 {
  margin-top: 8px;
}
.trust {
  margin-top: 12px;
}
.trust div {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--hf-text-muted);
}

/* Info states (already applied / success) */
.apply-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 12px 4px;
}
.info-badge {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--hf-accent-soft);
  color: #047857;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
}
.apply-info h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--hf-text);
}
.apply-info p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}
.track-link {
  margin-top: 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--hf-primary);
  text-decoration: none;
}
.track-link:hover {
  text-decoration: underline;
}

/* Not found */
.jd-notfound {
  padding: 90px 20px;
  text-align: center;
}
.jd-notfound h1 {
  margin: 12px 0 6px;
  font-size: 22px;
  font-weight: 600;
}

/* Skeleton */
.sk-line {
  height: 12px;
  border-radius: 6px;
  margin-top: 10px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: sk 1.4s ease infinite;
}
@keyframes sk {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

@media (max-width: 860px) {
  .jd-grid {
    grid-template-columns: 1fr;
  }
  .jd-right {
    position: static;
  }
}
</style>
