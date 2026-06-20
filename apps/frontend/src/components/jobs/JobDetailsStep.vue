<template>
  <section class="hf-card step-card">
    <div>
      <h3 class="hf-h2">Job details</h3>
      <div class="hf-muted sub">How this role appears to candidates.</div>
    </div>

    <div class="grid two-one">
      <AppField v-model="form.title" label="Job title *" placeholder="Senior Backend Engineer" :error="errors.title" />
      <AppField v-model="form.department" label="Department" placeholder="Engineering" />
    </div>

    <div class="grid three">
      <AppField v-model="form.location" label="Location *" placeholder="Austin, TX" :error="errors.location" />
      <div class="field">
        <label class="field-label">Employment</label>
        <SegmentedTabs v-model="form.jobType" :options="jobTypeOptions" />
      </div>
      <AppField v-model="form.employmentType" type="select" label="Type" :items="employmentOptions" />
    </div>

    <div class="grid two salary">
      <AppField v-model="form.salaryMin" label="Salary min" prefix="$" placeholder="180,000" :error="errors.salaryMin" />
      <AppField v-model="form.salaryMax" label="Salary max" prefix="$" placeholder="230,000" :error="errors.salaryMax" />
    </div>

    <div class="field">
      <label class="field-label">About the role *</label>
      <v-textarea
        v-model="form.description"
        class="hf-textarea"
        variant="outlined"
        rows="5"
        auto-grow
        hide-details
        placeholder="What the team does, the impact of this role, what a typical week looks like…"
      />
      <span v-if="errors.description" class="field-err">{{ errors.description }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppField from '@/components/common/AppField.vue'
import SegmentedTabs from '@/components/common/SegmentedTabs.vue'
import {
  type JobFormState,
  type JobType,
  type EmploymentType,
  JOB_TYPE_LABELS,
  EMPLOYMENT_LABELS,
} from '@/types/job'

defineProps<{ form: JobFormState; errors: Record<string, string> }>()

const jobTypeOptions = (['ONSITE', 'HYBRID', 'REMOTE'] as JobType[]).map((v) => ({
  label: JOB_TYPE_LABELS[v],
  value: v,
}))
const employmentOptions = (
  ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] as EmploymentType[]
).map((v) => ({ title: EMPLOYMENT_LABELS[v], value: v }))
</script>

<style scoped>
.step-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sub {
  margin-top: 2px;
  font-size: 12.5px;
}
.grid {
  display: grid;
  gap: 12px;
}
.grid.two {
  grid-template-columns: 1fr 1fr;
}
.grid.two-one {
  grid-template-columns: 2fr 1fr;
}
.grid.three {
  grid-template-columns: 1fr 1fr 1fr;
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
  color: var(--hf-danger);
}
/* textarea: same border + focus treatment as AppField (design .hf-textarea) */
.hf-textarea :deep(.v-field) {
  border-radius: 9px;
  font-size: 14px;
  --v-field-border-opacity: 1;
  --v-field-padding-start: 14px;
  --v-field-padding-end: 14px;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.hf-textarea :deep(.v-field--variant-outlined .v-field__outline__start),
.hf-textarea :deep(.v-field--variant-outlined .v-field__outline__end),
.hf-textarea :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.hf-textarea :deep(.v-field--variant-outlined .v-field__outline__notch::after) {
  border-color: var(--hf-border);
}
.hf-textarea :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px var(--hf-primary-soft);
}
.hf-textarea :deep(.v-field--focused .v-field__outline__start),
.hf-textarea :deep(.v-field--focused .v-field__outline__end),
.hf-textarea :deep(.v-field--focused .v-field__outline__notch::before),
.hf-textarea :deep(.v-field--focused .v-field__outline__notch::after) {
  border-color: var(--hf-primary);
}
.hf-textarea :deep(textarea::placeholder) {
  color: #9ca3af;
  opacity: 1;
}

/* salary: kill prefix-induced extra height + keep $ aligned, match 44px fields */
.salary :deep(.v-field__field) {
  align-items: center;
}
.salary :deep(.v-text-field__prefix) {
  display: flex;
  align-items: center;
  align-self: stretch;
  min-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 1;
}
.salary :deep(.v-field__input) {
  min-height: 44px;
}

</style>
