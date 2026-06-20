<template>
  <div class="hf-card table-card">
    <table class="hf-table">
      <thead>
        <tr>
          <th class="sortable" @click="emit('sort', 'title')">
            Job <span v-if="sortBy === 'title'" class="caret">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th>Status</th>
          <th>Applicants</th>
          <th class="sortable" @click="emit('sort', 'publishedAt')">
            Opened <span v-if="sortBy === 'publishedAt'" class="caret">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
          </th>
          <th style="width: 56px"></th>
        </tr>
      </thead>

      <tbody>
        <!-- loading skeletons -->
        <template v-if="loading">
          <tr v-for="n in pageSize" :key="`sk-${n}`" class="skeleton-row">
            <td><div class="sk sk-job" /></td>
            <td><div class="sk sk-pill" /></td>
            <td><div class="sk sk-num" /></td>
            <td><div class="sk sk-date" /></td>
            <td></td>
          </tr>
        </template>

        <!-- data rows -->
        <template v-else>
          <tr v-for="job in jobs" :key="job.id" class="row" @click="emit('row-click', job)">
            <td>
              <div class="job-cell">
                <div class="avatar" :style="avatarStyle(job.title)">{{ initial(job.title) }}</div>
                <div class="job-text">
                  <div class="hf-cand-name">{{ job.title }}</div>
                  <div class="hf-cand-sub">{{ subtitle(job) }}</div>
                </div>
              </div>
            </td>
            <td><JobStatusPill :status="job.status" /></td>
            <td class="num">{{ job.applicationCount }}</td>
            <td class="hf-cand-sub">{{ opened(job) }}</td>
            <td class="actions" @click.stop>
              <v-menu location="bottom end">
                <template #activator="{ props: menuProps }">
                  <button class="hf-icon-btn" v-bind="menuProps" aria-label="Actions">⋯</button>
                </template>
                <v-list class="hf-select-menu" density="compact">
                  <v-list-item
                    v-for="a in actionsFor(job)"
                    :key="a.type"
                    @click="emit('action', { type: a.type, job })"
                  >
                    <v-list-item-title :class="{ danger: a.type === 'delete' }">{{ a.label }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </td>
          </tr>

          <!-- empty state -->
          <tr v-if="jobs.length === 0">
            <td colspan="5">
              <div class="empty">No jobs match your filters.</div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <div class="footer">
      <span>Showing <b>{{ jobs.length }}</b> of <b>{{ total }}</b> jobs</span>
      <div class="pager">
        <button class="hf-btn ghost" :disabled="page <= 1 || loading" @click="emit('page', page - 1)">Prev</button>
        <span class="page-ind">Page {{ page }} of {{ Math.max(totalPages, 1) }}</span>
        <button class="hf-btn ghost" :disabled="page >= totalPages || loading" @click="emit('page', page + 1)">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobListItem, JobStatus } from '@/types/job'
import { JOB_TYPE_LABELS } from '@/types/job'
import JobStatusPill from './JobStatusPill.vue'

const props = defineProps<{
  jobs: readonly JobListItem[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  sortBy: 'createdAt' | 'title' | 'publishedAt'
  sortOrder: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  sort: ['title' | 'publishedAt']
  page: [number]
  'row-click': [JobListItem]
  action: [{ type: 'publish' | 'close' | 'reopen' | 'delete' | 'edit'; job: JobListItem }]
}>()

const totalPages = computed(() => (props.total === 0 ? 0 : Math.ceil(props.total / props.pageSize)))

function initial(title: string): string {
  return (title.trim()[0] ?? '?').toUpperCase()
}

// deterministic indigo-ish gradient from the title so avatars are stable
function avatarStyle(title: string) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360
  const c = `hsl(${h}, 55%, 55%)`
  return { background: `linear-gradient(135deg, ${c}, ${c})` }
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
.table-card {
  padding: 0;
  overflow: hidden;
}
.hf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.hf-table thead th {
  padding: 10px 16px;
  text-align: left;
  font-weight: 500;
  color: var(--hf-text-muted);
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  border-bottom: 1px solid var(--hf-border);
  background: var(--hf-surface-alt);
}
.hf-table thead th.sortable {
  cursor: pointer;
  user-select: none;
}
.caret {
  font-size: 9px;
  margin-left: 2px;
}
.hf-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--hf-border);
  vertical-align: middle;
}
.row {
  cursor: pointer;
}
.row:hover td {
  background: var(--hf-surface-alt);
}
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
.actions {
  text-align: right;
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
.empty {
  padding: 40px;
  text-align: center;
  color: var(--hf-text-muted);
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--hf-surface-alt);
  border-top: 1px solid var(--hf-border);
  font-size: 12.5px;
  color: var(--hf-text-muted);
}
.pager {
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-ind {
  font-variant-numeric: tabular-nums;
}
/* skeleton */
.sk {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #eef0f3 25%, #f6f7f9 50%, #eef0f3 75%);
  background-size: 200% 100%;
  animation: sk 1.2s ease-in-out infinite;
}
.sk-job { width: 180px; height: 28px; }
.sk-pill { width: 70px; }
.sk-num { width: 24px; }
.sk-date { width: 80px; }
@keyframes sk {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
