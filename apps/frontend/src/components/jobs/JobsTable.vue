<template>
  <AppDataTable
      :columns="visibleColumns"
      :rows="jobs"
      :loading="loading"
      :server-items-length="total"
      :page="page"
      :items-per-page="pageSize"
      :sort-by="vSortBy"
      item-value="id"
      @update:options="onOptions"
      @row-click="(row) => emit('row-click', row as JobListItem)"
    >
      <!-- Job: gradient initial avatar + title + subtitle -->
      <template #item.title="{ item }">
        <div class="job-cell">
          <div class="avatar" :style="avatarStyle((item as JobListItem).title)">
            {{ initial((item as JobListItem).title) }}
          </div>
          <div>
            <div class="hf-cand-name">{{ (item as JobListItem).title }}</div>
            <div class="hf-cand-sub">{{ subtitle(item as JobListItem) }}</div>
          </div>
        </div>
      </template>

      <!-- Status pill -->
      <template #item.status="{ item }">
        <JobStatusPill :status="(item as JobListItem).status" />
      </template>

      <!-- Applicants — tabular figures -->
      <template #item.applicationCount="{ item }">
        <span class="num">{{ (item as JobListItem).applicationCount }}</span>
      </template>

      <!-- Opened date (publishedAt ?? createdAt) -->
      <template #item.publishedAt="{ item }">
        <span class="hf-cand-sub">{{ opened(item as JobListItem) }}</span>
      </template>

      <!-- Owner: avatar (gradient initials or img) + first name -->
      <template #item.owner="{ item }">
        <div class="owner-cell">
          <img
            v-if="(item as JobListItem).owner.avatarUrl"
            :src="(item as JobListItem).owner.avatarUrl!"
            class="owner-avatar"
            :alt="(item as JobListItem).owner.fullName"
          />
          <span
            v-else
            class="owner-avatar"
            :style="avatarStyle((item as JobListItem).owner.fullName)"
          >{{ ownerInitials((item as JobListItem).owner.fullName) }}</span>
          <span class="owner-name">{{ (item as JobListItem).owner.fullName.split(' ')[0] }}</span>
        </div>
      </template>

      <!-- Actions menu — status-dependent -->
      <template #item.actions="{ item }">
        <div @click.stop>
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <button class="hf-icon-btn" v-bind="menuProps" aria-label="Actions">⋯</button>
            </template>
            <v-list class="hf-select-menu" density="compact">
              <v-list-item
                v-for="a in actionsFor(item as JobListItem)"
                :key="a.type"
                @click="emit('action', { type: a.type, job: item as JobListItem })"
              >
                <v-list-item-title :class="{ danger: a.type === 'delete' }">{{ a.label }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </template>

      <template #empty>No jobs match your filters.</template>
    </AppDataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobListItem, JobStatus } from '@/types/job'
import { JOB_TYPE_LABELS } from '@/types/job'
import AppDataTable, { type Column, type DataTableOptions } from '@/components/common/AppDataTable.vue'
import JobStatusPill from './JobStatusPill.vue'

type ServerSortBy = 'createdAt' | 'title' | 'publishedAt'

const props = defineProps<{
  jobs: readonly JobListItem[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  sortBy: ServerSortBy
  sortOrder: 'asc' | 'desc'
  hiddenCols: string[]
}>()

const emit = defineEmits<{
  'row-click': [JobListItem]
  action: [{ type: 'publish' | 'close' | 'reopen' | 'delete' | 'edit'; job: JobListItem }]
  'update:options': [{ page: number; pageSize: number; sortBy: ServerSortBy; sortOrder: 'asc' | 'desc' }]
}>()

const columns: Column[] = [
  { key: 'title', title: 'Job', sortable: true },
  { key: 'status', title: 'Status' },
  { key: 'applicationCount', title: 'Applicants' },
  { key: 'publishedAt', title: 'Opened', sortable: true },
  { key: 'owner', title: 'Owner' },
  { key: 'actions', title: '', width: 56, align: 'end' },
]

const visibleColumns = computed(() => columns.filter((c) => !props.hiddenCols.includes(c.key)))

const SORTABLE_KEYS: ServerSortBy[] = ['title', 'publishedAt']

// Map our backend sort state into Vuetify's controlled sort-by array. Only emit a
// sort indicator for keys that are actual sortable columns; the default `createdAt`
// has no column, so represent it as "no active sort" ([]) rather than a phantom key.
const vSortBy = computed(() =>
  SORTABLE_KEYS.includes(props.sortBy) ? [{ key: props.sortBy, order: props.sortOrder }] : [],
)

function onOptions(o: DataTableOptions): void {
  const head = o.sortBy[0]
  const key = head && SORTABLE_KEYS.includes(head.key as ServerSortBy) ? (head.key as ServerSortBy) : 'createdAt'
  const order = head?.order ?? 'desc'
  emit('update:options', { page: o.page, pageSize: o.itemsPerPage, sortBy: key, sortOrder: order })
}

function initial(title: string): string {
  return (title.trim()[0] ?? '?').toUpperCase()
}

// deterministic two-tone gradient from the title so avatars are stable
function avatarStyle(title: string) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360
  const c1 = `hsl(${h}, 55%, 55%)`
  const c2 = `hsl(${(h + 40) % 360}, 55%, 48%)`
  return { background: `linear-gradient(135deg, ${c1}, ${c2})` }
}

function ownerInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function subtitle(job: JobListItem): string {
  const parts = [job.department, job.location, JOB_TYPE_LABELS[job.jobType]].filter(Boolean)
  return parts.join(' · ')
}

function opened(job: JobListItem): string {
  const iso = job.publishedAt ?? job.createdAt
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

type Action = { type: 'publish' | 'close' | 'reopen' | 'delete' | 'edit'; label: string }
function actionsFor(job: JobListItem): Action[] {
  const status: JobStatus = job.status
  const base: Action[] = [{ type: 'edit', label: 'Edit' }]
  if (status === 'DRAFT') base.unshift({ type: 'publish', label: 'Publish' })
  if (status === 'PUBLISHED') base.unshift({ type: 'close', label: 'Close' })
  if (status === 'CLOSED') base.unshift({ type: 'reopen', label: 'Reopen' })
  base.push({ type: 'delete', label: 'Delete' })
  return base
}
</script>

<style scoped>
.job-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hf-cand-name {
  font-weight: 500;
  color: var(--hf-text);
}
.hf-cand-sub {
  font-size: 11.5px;
  color: var(--hf-text-subtle);
}
.num {
  font-variant-numeric: tabular-nums;
}
.hf-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--hf-text-muted);
  font-size: 18px;
  line-height: 1;
}
.hf-icon-btn:hover {
  background: var(--hf-bg);
  color: var(--hf-text);
}
.danger {
  color: var(--hf-danger);
}
.owner-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.owner-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  font-weight: 600;
  font-size: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  object-fit: cover;
}
.owner-name {
  font-size: 12.5px;
}
</style>
