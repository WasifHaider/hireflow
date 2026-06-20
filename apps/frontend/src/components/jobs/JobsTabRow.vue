<template>
  <div class="hf-tab-row">
    <div
      v-for="t in tabs"
      :key="t.value"
      class="tab"
      :class="{ active: status === t.value }"
      @click="emit('update:status', t.value)"
    >
      {{ t.label }}<span class="count">{{ t.count }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobStatus } from '@/types/job'

type StatusFilter = JobStatus | 'ALL'
const props = defineProps<{ status: StatusFilter; counts: { all: number; DRAFT: number; PUBLISHED: number; CLOSED: number } }>()
const emit = defineEmits<{ 'update:status': [StatusFilter] }>()

const tabs = computed<{ label: string; value: StatusFilter; count: number }[]>(() => [
  { label: 'All', value: 'ALL', count: props.counts.all },
  { label: 'Draft', value: 'DRAFT', count: props.counts.DRAFT },
  { label: 'Published', value: 'PUBLISHED', count: props.counts.PUBLISHED },
  { label: 'Closed', value: 'CLOSED', count: props.counts.CLOSED },
])
</script>

<style scoped>
.hf-tab-row { display: flex; align-items: center; gap: 2px; }
.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  font-size: 13px; font-weight: 500;
  color: var(--hf-text-muted);
  border-radius: 8px;
  cursor: pointer;
}
.tab:hover { background: var(--hf-bg); color: var(--hf-text); }
.tab.active { color: var(--hf-primary); background: var(--hf-primary-soft); }
.count {
  font-family: var(--hf-mono);
  font-size: 10.5px;
  color: var(--hf-text-subtle);
}
.tab.active .count { color: var(--hf-primary); }
</style>
