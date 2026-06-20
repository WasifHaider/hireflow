<template>
  <section class="hf-card step-card">
    <div class="head">
      <div>
        <h3 class="hf-h2">Requirements &amp; skills</h3>
        <div class="hf-muted sub">HireFlow scores candidates against these.</div>
      </div>
    </div>

    <div class="field">
      <label class="field-label">Requirements *</label>
      <v-textarea
        v-model="form.requirements"
        class="hf-textarea"
        variant="outlined"
        rows="4"
        auto-grow
        hide-details
        placeholder="What candidates must bring — responsibilities, must-haves, the bar for this role…"
      />
      <span v-if="errors.requirements" class="field-err">{{ errors.requirements }}</span>
      <div class="hf-help">Used alongside the description for AI fit scoring</div>
    </div>

    <div class="field">
      <label class="field-label">Must-have skills</label>
      <SkillChipInput v-model="form.mustHaveSkills" accent />
      <div class="hf-help">Heavily weighted in AI scoring</div>
    </div>

    <div class="field">
      <label class="field-label">Nice-to-have</label>
      <SkillChipInput v-model="form.niceToHaveSkills" />
    </div>

    <div class="grid two">
      <AppField v-model="form.minExperienceYears" label="Min experience (years)" placeholder="6" :error="errors.minExperienceYears" />
      <AppField v-model="form.education" label="Education" placeholder="BS in CS or related" />
    </div>

    <div class="field">
      <label class="field-label">Auto-reject below score</label>
      <div class="slider-row">
        <v-slider
          v-model="form.autoRejectScore"
          class="hf-slider"
          :min="0"
          :max="100"
          :step="1"
          hide-details
          color="primary"
        />
        <div class="score-box">{{ form.autoRejectScore }}</div>
      </div>
      <div class="hf-help">
        Candidates below this score are auto-moved to "Rejected" with a polite email
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppField from '@/components/common/AppField.vue'
import SkillChipInput from './SkillChipInput.vue'
import type { JobFormState } from '@/types/job'

defineProps<{ form: JobFormState; errors: Record<string, string> }>()
</script>

<style scoped>
.step-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head {
  display: flex;
  align-items: center;
}
.sub {
  margin-top: 2px;
  font-size: 12.5px;
}
.grid.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
.slider-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.hf-slider {
  flex: 1;
}
.score-box {
  width: 56px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  font: 600 13px var(--hf-mono);
  text-align: center;
}
</style>
