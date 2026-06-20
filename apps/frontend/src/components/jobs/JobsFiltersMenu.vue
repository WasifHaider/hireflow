<template>
  <v-menu :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: act }">
      <button class="hf-btn ghost" v-bind="act">
        <HfIcon name="filter" :size="14" />Filters
        <span v-if="activeCount" class="hf-tag badge">{{ activeCount }}</span>
      </button>
    </template>
    <div class="hf-select-menu filters-pop">
      <v-select
        v-model="draft.department"
        label="Department"
        :items="deptItems"
        variant="outlined"
        density="compact"
        clearable
        hide-details
      />
      <v-select
        v-model="draft.location"
        label="Location"
        :items="locItems"
        variant="outlined"
        density="compact"
        clearable
        hide-details
      />
      <v-select
        v-model="draft.jobType"
        label="Work mode"
        :items="workModeItems"
        variant="outlined"
        density="compact"
        clearable
        hide-details
      />
      <v-select
        v-model="draft.employmentType"
        label="Job type"
        :items="jobTypeItems"
        variant="outlined"
        density="compact"
        clearable
        hide-details
      />
      <div class="actions">
        <AppButton variant="ghost" @click="clearAll">Clear all</AppButton>
        <AppButton variant="primary" @click="apply">Apply</AppButton>
      </div>
    </div>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { JobFacets, JobType, EmploymentType } from '@/types/job'
import { JOB_TYPE_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/types/job'
import HfIcon from '@/components/common/HfIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

export interface JobFilters {
  department?: string
  location?: string
  jobType?: JobType
  employmentType?: EmploymentType
}

const props = defineProps<{ facets: JobFacets; modelValue: JobFilters }>()
const emit = defineEmits<{ 'update:modelValue': [JobFilters] }>()

const draft = reactive<JobFilters>({ ...props.modelValue })
watch(
  () => props.modelValue,
  (v) => Object.assign(draft, v),
)

const deptItems = computed(() => props.facets.departments.map((d) => ({ title: d, value: d })))
const locItems = computed(() => props.facets.locations.map((l) => ({ title: l, value: l })))
const workModeItems = (Object.keys(JOB_TYPE_LABELS) as JobType[]).map((k) => ({
  title: JOB_TYPE_LABELS[k],
  value: k,
}))
const jobTypeItems = (Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((k) => ({
  title: EMPLOYMENT_TYPE_LABELS[k],
  value: k,
}))

// Badge counts from committed modelValue (not draft) — shows how many filters are active.
const activeCount = computed(
  () => Object.values(props.modelValue).filter((v) => v != null && v !== '').length,
)

function apply() {
  emit('update:modelValue', { ...draft })
}

function clearAll() {
  draft.department = undefined
  draft.location = undefined
  draft.jobType = undefined
  draft.employmentType = undefined
  emit('update:modelValue', {})
}
</script>

<style scoped>
.badge {
  margin-left: 4px;
  height: 18px;
  padding: 0 6px;
  font-size: 10.5px;
}
.filters-pop {
  padding: 14px;
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--hf-surface);
}
.actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-top: 4px;
}
</style>
