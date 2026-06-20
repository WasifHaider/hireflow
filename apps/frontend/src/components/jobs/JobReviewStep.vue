<template>
  <section class="hf-card step-card">
    <div>
      <h3 class="hf-h2">Review &amp; publish</h3>
      <div class="hf-muted sub">Check the details, then save as draft or publish live.</div>
    </div>

    <dl class="review">
      <div class="row"><dt>Title</dt><dd>{{ form.title || '—' }}</dd></div>
      <div class="row"><dt>Department</dt><dd>{{ form.department || '—' }}</dd></div>
      <div class="row"><dt>Location</dt><dd>{{ form.location || '—' }} · {{ jobTypeLabel }}</dd></div>
      <div class="row"><dt>Type</dt><dd>{{ employmentLabel }}</dd></div>
      <div class="row"><dt>Salary</dt><dd>{{ salaryText }}</dd></div>
      <div class="row"><dt>Min experience</dt><dd>{{ form.minExperienceYears ? form.minExperienceYears + ' yrs' : '—' }}</dd></div>
      <div class="row"><dt>Education</dt><dd>{{ form.education || '—' }}</dd></div>
      <div class="row"><dt>Auto-reject below</dt><dd>{{ form.autoRejectScore }}</dd></div>
      <div class="row">
        <dt>Must-have</dt>
        <dd>
          <span v-if="!form.mustHaveSkills.length">—</span>
          <span v-for="s in form.mustHaveSkills" :key="s" class="hf-tag accent chip">{{ s }}</span>
        </dd>
      </div>
      <div class="row">
        <dt>Nice-to-have</dt>
        <dd>
          <span v-if="!form.niceToHaveSkills.length">—</span>
          <span v-for="s in form.niceToHaveSkills" :key="s" class="hf-tag neutral chip">{{ s }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type JobFormState, JOB_TYPE_LABELS, EMPLOYMENT_LABELS } from '@/types/job'

const props = defineProps<{ form: JobFormState }>()

const jobTypeLabel = computed(() => JOB_TYPE_LABELS[props.form.jobType])
const employmentLabel = computed(() => EMPLOYMENT_LABELS[props.form.employmentType])
const salaryText = computed(() => {
  const { salaryMin, salaryMax, salaryCurrency } = props.form
  if (!salaryMin && !salaryMax) return '—'
  const fmt = (s: string) => s.replace(/[^0-9.]/g, '')
  return `${salaryCurrency} ${fmt(salaryMin) || '?'}–${fmt(salaryMax) || '?'}`
})
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
.review {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
}
.row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--hf-border);
}
.row:last-child {
  border-bottom: 0;
}
dt {
  font-size: 12.5px;
  color: var(--hf-text-muted);
}
dd {
  margin: 0;
  font-size: 13px;
  color: var(--hf-text);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
}
</style>
