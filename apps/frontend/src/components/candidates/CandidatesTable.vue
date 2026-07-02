<template>
  <AppDataTable
    :columns="columns"
    :rows="rows"
    item-value="id"
    :loading="loading"
    :server-items-length="total"
    :page="page"
    :items-per-page="pageSize"
    :sort-by="sortByModel"
    @row-click="(r) => emit('row-click', r as CandidateListItem)"
    @update:options="onOptions"
  >
    <template #item.aiFitScore="{ item }">
      <span v-if="item.aiFitScore == null" class="hf-muted">—</span>
      <span v-else class="hf-score" :class="scoreLevel(item.aiFitScore)">{{ item.aiFitScore }}</span>
    </template>
    <template #item.currentStage="{ item }">
      <span class="hf-stage" :class="item.currentStage.toLowerCase()">{{ STAGE_LABELS[item.currentStage as ApplicationStage] }}</span>
    </template>
    <template #empty>No candidates match these filters.</template>
  </AppDataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppDataTable, { type Column, type DataTableOptions, type SortItem } from '@/components/common/AppDataTable.vue'
import type { ApplicationStage, CandidateListItem } from '@/types/candidate'
import { STAGE_LABELS } from '@/types/candidate'
import { scoreLevel } from '@/utils/score'

const props = withDefaults(
  defineProps<{
    candidates: CandidateListItem[]
    loading: boolean
    total: number
    page: number
    pageSize: number
    sortBy: 'appliedAt' | 'aiFitScore'
    sortOrder: 'asc' | 'desc'
    hiddenCols?: string[]
  }>(),
  { hiddenCols: () => [] },
)

const emit = defineEmits<{
  'row-click': [CandidateListItem]
  'update:options': [{ page: number; pageSize: number; sortBy: 'appliedAt' | 'aiFitScore'; sortOrder: 'asc' | 'desc' }]
}>()

// Flatten nested fields so AppDataTable's field accessors can read them.
const rows = computed(() =>
  props.candidates.map((c) => ({
    ...c,
    candidateName: c.candidate.fullName,
    candidateEmail: c.candidate.email,
    jobTitle: c.job.title,
    appliedLabel: `Applied ${formatDate(c.appliedAt)}`,
  })),
)

// Candidate column is always shown; the rest are toggleable via the columns menu.
const ALL_COLUMNS: Column[] = [
  { key: 'candidateName', title: 'Candidate', type: 'avatar', subField: 'candidateEmail' },
  { key: 'jobTitle', title: 'Applying for', type: 'twoLine', subField: 'appliedLabel' },
  { key: 'aiFitScore', title: 'AI fit', sortable: true },
  { key: 'currentStage', title: 'Stage' },
]
const columns = computed<Column[]>(() => ALL_COLUMNS.filter((c) => !props.hiddenCols.includes(c.key)))

const sortByModel = computed<SortItem[]>(() => [{ key: props.sortBy, order: props.sortOrder }])

function onOptions(o: DataTableOptions) {
  const sort = o.sortBy[0]
  emit('update:options', {
    page: o.page,
    pageSize: o.itemsPerPage,
    sortBy: (sort?.key as 'appliedAt' | 'aiFitScore') ?? props.sortBy,
    sortOrder: sort?.order ?? props.sortOrder,
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
