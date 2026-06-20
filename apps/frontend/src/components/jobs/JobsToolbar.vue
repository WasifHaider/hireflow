<template>
  <div class="toolbar">
    <div class="top">
      <div>
        <h1 class="hf-h1">Jobs</h1>
        <div class="hf-muted">Manage your open roles and drafts.</div>
      </div>
      <button class="hf-btn primary" @click="emit('new')"><HfIcon name="plus" :size="14" />New job</button>
    </div>

    <div class="filters">
      <JobsTabRow :status="status" :counts="counts" @update:status="emit('update:status', $event)" />
      <div class="right">
        <div class="search">
          <HfIcon name="search" :size="15" />
          <input :value="search" type="text" placeholder="Search jobs…"
                 @input="emit('update:search', ($event.target as HTMLInputElement).value)" />
        </div>
        <JobsFiltersMenu :facets="facets" :model-value="filters" @update:model-value="emit('update:filters', $event)" />
        <JobsOwnerMenu :owners="facets.owners" :model-value="ownerId" @update:model-value="emit('update:ownerId', $event)" />
        <JobsColumnsMenu :model-value="hiddenCols" @update:model-value="emit('update:hiddenCols', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JobStatus, JobFacets } from '@/types/job'
import HfIcon from '@/components/common/HfIcon.vue'
import JobsTabRow from './JobsTabRow.vue'
import JobsFiltersMenu, { type JobFilters } from './JobsFiltersMenu.vue'
import JobsOwnerMenu from './JobsOwnerMenu.vue'
import JobsColumnsMenu from './JobsColumnsMenu.vue'

type StatusFilter = JobStatus | 'ALL'

defineProps<{
  search: string
  status: StatusFilter
  counts: { all: number; DRAFT: number; PUBLISHED: number; CLOSED: number }
  facets: JobFacets
  filters: JobFilters
  ownerId?: string
  hiddenCols: string[]
}>()
const emit = defineEmits<{
  'update:search': [string]
  'update:status': [StatusFilter]
  'update:filters': [JobFilters]
  'update:ownerId': [string | undefined]
  'update:hiddenCols': [string[]]
  new: []
}>()
</script>

<style scoped>
.toolbar { display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: flex-start; justify-content: space-between; }
.filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.search {
  display: flex; align-items: center; gap: 8px;
  height: 38px; width: 260px; padding: 0 12px;
  border-radius: 9px; background: var(--hf-surface);
  border: 1px solid var(--hf-border); color: var(--hf-text-muted);
}
.search input { border: 0; outline: 0; background: transparent; width: 100%; font-size: 14px; color: var(--hf-text); }
</style>
