<template>
  <div class="job-form">
    <!-- Header: breadcrumb + actions -->
    <div class="head-row">
      <div>
        <div class="hf-muted crumb">
          <RouterLink to="/jobs" class="crumb-link">Jobs</RouterLink>
          &nbsp;/&nbsp;
          <span class="crumb-current">{{ isEdit ? 'Edit job' : 'New job' }}</span>
        </div>
        <h1 class="hf-h1">{{ isEdit ? 'Edit job' : 'Create a new job' }}</h1>
      </div>
      <div class="head-actions">
        <button v-if="step > 1" class="hf-btn ghost" :disabled="jobs.saving" @click="back">Back</button>
        <button class="hf-btn ghost" :disabled="jobs.saving" @click="submit('DRAFT')">Save draft</button>
        <button v-if="step < TOTAL" class="hf-btn primary" @click="next">
          Continue<HfIcon name="arrowRight" :size="14" />
        </button>
        <button v-else class="hf-btn primary" :disabled="jobs.saving" @click="submit('PUBLISHED')">
          Publish<HfIcon name="check" :size="14" />
        </button>
      </div>
    </div>

    <JobStepper :current="step" @jump="goTo" />

    <div v-if="formError" class="form-error">{{ formError }}</div>

    <!-- Two-column: active step on the left, live preview on the right -->
    <div class="grid">
      <div class="col-left">
        <JobDetailsStep v-show="step === 1" :form="form" :errors="errors" />
        <JobRequirementsStep v-show="step === 2" :form="form" :errors="errors" />
        <JobPipelineStep v-show="step === 3" />
        <JobReviewStep v-show="step === 4" :form="form" />
      </div>
      <JobPreview :form="form" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import HfIcon from '@/components/common/HfIcon.vue'
import JobStepper from '@/components/jobs/JobStepper.vue'
import JobDetailsStep from '@/components/jobs/JobDetailsStep.vue'
import JobRequirementsStep from '@/components/jobs/JobRequirementsStep.vue'
import JobPipelineStep from '@/components/jobs/JobPipelineStep.vue'
import JobReviewStep from '@/components/jobs/JobReviewStep.vue'
import JobPreview from '@/components/jobs/JobPreview.vue'
import { useJobsStore } from '@/stores/jobs.store'
import { emptyJobForm, toJobPayload, type JobFormState, type JobStatus } from '@/types/job'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const jobs = useJobsStore()

const TOTAL = 4
const step = ref(1)
const form = reactive<JobFormState>(emptyJobForm())
const errors = reactive<Record<string, string>>({})
const formError = ref<string | null>(null)
const isEdit = computed(() => !!props.id)

onMounted(async () => {
  if (!props.id) return
  try {
    const job = await jobs.fetchJob(props.id)
    Object.assign(form, {
      title: job.title,
      department: job.department ?? '',
      location: job.location,
      jobType: job.jobType,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin?.toString() ?? '',
      salaryMax: job.salaryMax?.toString() ?? '',
      salaryCurrency: job.salaryCurrency,
      description: job.description,
      requirements: job.requirements,
      mustHaveSkills: [...job.mustHaveSkills],
      niceToHaveSkills: [...job.niceToHaveSkills],
      minExperienceYears: job.minExperienceYears?.toString() ?? '',
      education: job.education ?? '',
      autoRejectScore: job.autoRejectScore ?? 55,
    } satisfies JobFormState)
  } catch {
    formError.value = jobs.error
  }
})

function clearErrors() {
  for (const k of Object.keys(errors)) delete errors[k]
}

const numeric = (s: string) => Number(s.replace(/[^0-9.]/g, ''))

function validateStep(s: number): boolean {
  clearErrors()
  if (s === 1) {
    if (form.title.trim().length < 2) errors.title = 'Title must be at least 2 characters.'
    if (form.location.trim().length < 2) errors.location = 'Location is required.'
    if (form.description.trim().length < 20)
      errors.description = 'Description must be at least 20 characters.'
    if (form.salaryMin && Number.isNaN(numeric(form.salaryMin))) errors.salaryMin = 'Enter a number.'
    if (form.salaryMax && Number.isNaN(numeric(form.salaryMax))) errors.salaryMax = 'Enter a number.'
    if (form.salaryMin && form.salaryMax && numeric(form.salaryMax) < numeric(form.salaryMin))
      errors.salaryMax = 'Max must be ≥ min.'
  }
  if (s === 2) {
    if (form.requirements.trim().length < 10)
      errors.requirements = 'Requirements must be at least 10 characters.'
    if (form.minExperienceYears && Number.isNaN(numeric(form.minExperienceYears)))
      errors.minExperienceYears = 'Enter a number.'
  }
  return Object.keys(errors).length === 0
}

function next() {
  if (validateStep(step.value)) step.value = Math.min(step.value + 1, TOTAL)
}
function back() {
  clearErrors()
  step.value = Math.max(step.value - 1, 1)
}
function goTo(target: number) {
  if (target <= step.value) {
    clearErrors()
    step.value = target
    return
  }
  // Forward jump — validate every step in between.
  for (let s = step.value; s < target; s++) {
    if (!validateStep(s)) {
      step.value = s
      return
    }
  }
  step.value = target
}

async function submit(status: JobStatus) {
  formError.value = null
  // Publishing requires all content steps valid; a draft can skip validation.
  if (status === 'PUBLISHED') {
    for (let s = 1; s <= TOTAL; s++) {
      if (!validateStep(s)) {
        step.value = s
        return
      }
    }
  } else {
    // Draft still needs the backend-required minimums (title/desc/requirements/location).
    if (!validateStep(1)) { step.value = 1; return }
    if (!validateStep(2)) { step.value = 2; return }
  }
  try {
    const payload = toJobPayload(form, status)
    if (props.id) {
      await jobs.updateJob(props.id, payload)
    } else {
      await jobs.createJob(payload)
    }
    router.push('/dashboard')
  } catch {
    formError.value = jobs.error
  }
}
</script>

<style scoped>
.job-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.head-row {
  display: flex;
  align-items: center;
}
.crumb {
  font-size: 12.5px;
  margin-bottom: 4px;
}
.crumb-link {
  color: inherit;
  text-decoration: none;
}
.crumb-current {
  color: var(--hf-text);
}
.head-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.form-error {
  font-size: 13px;
  color: var(--hf-danger);
  background: var(--hf-danger-soft);
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 520px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
