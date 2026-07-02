<template>
  <aside class="hf-card filter-sidebar">
    <!-- Stage -->
    <div class="filter-group">
      <div class="filter-title">Stage</div>
      <label v-for="s in STAGE_ORDER" :key="s" class="filter-row">
        <v-checkbox
          :model-value="selectedStages.includes(s)"
          density="compact"
          hide-details
          color="primary"
          @update:model-value="toggleStage(s)"
        />
        <span class="filter-label">{{ STAGE_LABELS[s] }}</span>
        <span class="filter-count">{{ facets.stages[s] ?? 0 }}</span>
      </label>
    </div>

    <!-- Job (single-select via radio-like checkboxes) -->
    <div class="filter-group">
      <div class="filter-title">Job</div>
      <label v-for="j in facets.jobs" :key="j.id" class="filter-row">
        <v-checkbox
          :model-value="selectedJobId === j.id"
          density="compact"
          hide-details
          color="primary"
          @update:model-value="toggleJob(j.id)"
        />
        <span class="filter-label">{{ j.title }}</span>
        <span class="filter-count">{{ j.count }}</span>
      </label>
      <div v-if="!facets.jobs.length" class="filter-empty">No jobs yet</div>
    </div>

    <!-- AI fit -->
    <div class="filter-group last">
      <div class="filter-title">AI fit</div>
      <label v-for="r in AI_FIT_RANGES" :key="r.key" class="filter-row">
        <v-checkbox
          :model-value="selectedRangeKey === r.key"
          density="compact"
          hide-details
          color="primary"
          @update:model-value="toggleRange(r)"
        />
        <span class="filter-label">{{ r.label }}</span>
        <span class="filter-count">{{ facets.aiFitRanges[r.key] ?? 0 }}</span>
      </label>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ApplicationStage, CandidateFacets } from '@/types/candidate'
import { STAGE_ORDER, STAGE_LABELS, AI_FIT_RANGES } from '@/types/candidate'

const props = defineProps<{
  facets: CandidateFacets
  selectedStages: ApplicationStage[]
  selectedJobId?: string
  selectedRangeKey?: string
}>()

const emit = defineEmits<{
  'update:stages': [ApplicationStage[]]
  'update:jobId': [string | undefined]
  'update:scoreRange': [{ key?: string; min?: number; max?: number }]
}>()

function toggleStage(s: ApplicationStage) {
  const next = props.selectedStages.includes(s)
    ? props.selectedStages.filter((x) => x !== s)
    : [...props.selectedStages, s]
  emit('update:stages', next)
}

function toggleJob(id: string) {
  emit('update:jobId', props.selectedJobId === id ? undefined : id)
}

function toggleRange(r: { key: string; min?: number; max?: number }) {
  if (props.selectedRangeKey === r.key) {
    emit('update:scoreRange', {})
  } else {
    emit('update:scoreRange', { key: r.key, min: r.min, max: r.max })
  }
}
</script>

<style scoped>
.filter-sidebar { padding: 18px; position: sticky; top: 20px; }
.filter-group { padding-bottom: 18px; border-bottom: 1px solid var(--hf-border); margin-bottom: 16px; }
.filter-group.last { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
.filter-title {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--hf-text-subtle); margin-bottom: 4px;
}
.filter-row { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.filter-row :deep(.v-selection-control) { min-height: 28px; flex: 0 0 auto; }
.filter-label { flex: 1; font-size: 12.5px; color: var(--hf-text); }
.filter-count { font-size: 11px; color: var(--hf-text-subtle); font-family: var(--hf-mono); }
.filter-empty { font-size: 12px; color: var(--hf-text-subtle); padding: 4px 0; }
</style>
