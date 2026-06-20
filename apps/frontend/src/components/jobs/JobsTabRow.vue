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

<!-- Wrapper/tab/active styling comes from the global .hf-tab-row classes in
     src/assets/hireflow.css (ported verbatim from the mockup styles.css:
     gray track, white active pill + shadow). Only the count needs styling. -->
<style scoped>
.count {
  margin-left: 6px;
  font-family: var(--hf-mono);
  font-size: 10.5px;
  color: var(--hf-text-subtle);
}
</style>
