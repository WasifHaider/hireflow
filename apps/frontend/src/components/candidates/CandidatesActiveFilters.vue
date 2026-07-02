<template>
  <div class="active-filters">
    <span class="label">Filters:</span>

    <button v-for="chip in chips" :key="chip.kind" class="chip" @click="emit(chip.clear)">
      {{ chip.text }}
      <HfIcon name="x" :size="11" class="chip-x" />
    </button>

    <a v-if="chips.length" class="clear-all" @click="emit('clear-all')">Clear all</a>

    <span class="count"><strong>{{ total }}</strong> matching candidates</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{
  stages: string[]
  totalStages: number
  jobTitle?: string
  rangeLabel?: string
  total: number
}>()

// Single-overload signature so a union-typed event name (chip.clear) is accepted.
const emit = defineEmits<{
  (e: 'clear-stages' | 'clear-job' | 'clear-range' | 'clear-all'): void
}>()

type Chip = { kind: string; text: string; clear: 'clear-stages' | 'clear-job' | 'clear-range' }

// A stage chip shows only for a proper non-empty subset (all/none = no filter).
const chips = computed<Chip[]>(() => {
  const out: Chip[] = []
  if (props.stages.length > 0 && props.stages.length < props.totalStages) {
    out.push({ kind: 'stages', text: `Stage: ${props.stages.length} selected`, clear: 'clear-stages' })
  }
  if (props.jobTitle) {
    out.push({ kind: 'job', text: `Job: ${props.jobTitle}`, clear: 'clear-job' })
  }
  if (props.rangeLabel) {
    out.push({ kind: 'range', text: `AI fit: ${props.rangeLabel}`, clear: 'clear-range' })
  }
  return out
})
</script>

<style scoped>
.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.label {
  font-size: 12px;
  color: var(--hf-text-muted);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--hf-primary-soft-2);
  background: var(--hf-primary-soft);
  border-radius: 99px;
  font-size: 11.5px;
  color: var(--hf-primary);
  font-weight: 500;
  cursor: pointer;
}
.chip-x { opacity: 0.7; }
.chip:hover .chip-x { opacity: 1; }
.clear-all {
  font-size: 12px;
  color: var(--hf-text-muted);
  font-weight: 500;
  margin-left: 4px;
  cursor: pointer;
}
.clear-all:hover { color: var(--hf-text); }
.count {
  margin-left: auto;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.count strong { color: var(--hf-text); }
</style>
