<template>
  <span class="pill" :style="style">
    <span class="dot" :style="{ background: cfg.dot }" />
    {{ cfg.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobStatus } from '@/types/job'

const props = defineProps<{ status: JobStatus }>()

const MAP: Record<JobStatus, { label: string; bg: string; color: string; border: string; dot: string }> = {
  PUBLISHED: { label: 'Published', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', dot: '#10B981' },
  DRAFT: { label: 'Draft', bg: 'var(--hf-bg)', color: 'var(--hf-text-muted)', border: 'var(--hf-border)', dot: '#94A3B8' },
  CLOSED: { label: 'Closed', bg: 'var(--hf-bg)', color: 'var(--hf-text-muted)', border: 'var(--hf-border)', dot: '#9CA3AF' },
}

const cfg = computed(() => MAP[props.status])
const style = computed(() => ({
  background: cfg.value.bg,
  color: cfg.value.color,
  border: `1px solid ${cfg.value.border}`,
}))
</script>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>
