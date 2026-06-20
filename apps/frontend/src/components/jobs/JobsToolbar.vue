<template>
  <div class="toolbar">
    <div class="top">
      <div>
        <h1 class="hf-h1">Jobs</h1>
        <div class="hf-muted">Manage your open roles and drafts.</div>
      </div>
      <AppButton variant="primary" @click="emit('new')">
        <HfIcon name="plus" :size="16" /> New job
      </AppButton>
    </div>

    <div class="filters">
      <SegmentedTabs :model-value="status" :options="statusOptions" @update:model-value="emit('update:status', $event)" />
      <div class="search">
        <HfIcon name="search" :size="15" />
        <input
          :value="search"
          type="text"
          placeholder="Search jobs…"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JobStatus } from '@/types/job'
import SegmentedTabs from '@/components/common/SegmentedTabs.vue'
import AppButton from '@/components/common/AppButton.vue'
import HfIcon from '@/components/common/HfIcon.vue'

type StatusFilter = JobStatus | 'ALL'

defineProps<{ search: string; status: StatusFilter }>()
const emit = defineEmits<{
  'update:search': [value: string]
  'update:status': [value: StatusFilter]
  new: []
}>()

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Closed', value: 'CLOSED' },
]
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  width: 280px;
  padding: 0 12px;
  border-radius: 9px;
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  color: var(--hf-text-muted);
}
.search input {
  border: 0;
  outline: 0;
  background: transparent;
  width: 100%;
  font-size: 14px;
  color: var(--hf-text);
}
</style>
