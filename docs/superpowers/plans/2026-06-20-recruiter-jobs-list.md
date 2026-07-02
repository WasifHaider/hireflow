# Recruiter Jobs List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully backend-wired recruiter Jobs List screen at `/jobs` with working search, status filter, sort, server-side pagination, per-job actions (publish/close/reopen/delete/edit), and loading states.

**Architecture:** One small backend addition (applicant count on the list query). On the frontend, a `JobsList.vue` container owns filter/page state and the fetch; presentational children (`JobsToolbar`, `JobsTable`, `JobStatusPill`) are dumb and event-driven. All data comes from the existing `GET /jobs` endpoint via a new `fetchJobs` store action.

**Tech Stack:** Backend — NestJS + Prisma + Jest (mocked Prisma). Frontend — Vue 3 `<script setup lang="ts">`, Vuetify 3, Pinia, vue-router, scoped CSS reusing `hireflow.css` `.hf-*` classes.

## Global Constraints

- Tenant isolation: list query already filters `companyId` + `deletedAt: null` — do not weaken it.
- Never leak Prisma's raw `_count` shape to the API; flatten to `applicationCount: number`.
- Vuetify-first; reuse shared atoms (`AppButton`, `AppField`, `SegmentedTabs`, `HfIcon`). Custom HTML only where Vuetify can't match the mockup table.
- Design tokens from `apps/frontend/src/assets/hireflow.css` (`--hf-primary #4F46E5`, `--hf-border #E5E7EB`, `--hf-accent #10B981`, etc.). Match the mockup pixel-for-pixel.
- Every fetch shows a loading state (project rule): table renders skeleton rows while `loading`.
- JobStatus values are exactly `'DRAFT' | 'PUBLISHED' | 'CLOSED'`.
- Frontend verification gate is `npx vue-tsc --noEmit -p tsconfig.app.json` (run from `apps/frontend`) — there is no frontend component-test infra. Backend uses Jest.
- Backend GET `/jobs` query params (already implemented, do not change): `page`, `pageSize`, `status`, `search`, `sortBy` ∈ {createdAt,title,publishedAt}, `sortOrder` ∈ {asc,desc}.

---

## File Structure

**Backend**
- Modify `apps/backend/src/jobs/jobs.service.ts` — `findAll` includes `_count.applications`, maps to `applicationCount`.
- Create `apps/backend/src/jobs/jobs.service.spec.ts` — unit test for the mapping.

**Frontend**
- Modify `apps/frontend/src/types/job.ts` — add `JobListItem`, `JobListResponse`, `JobListQuery`.
- Modify `apps/frontend/src/stores/jobs.store.ts` — add `fetchJobs`, `deleteJob`, `setJobStatus`.
- Modify `apps/frontend/src/router/index.ts` — swap `/jobs` redirect for the list route.
- Create `apps/frontend/src/components/jobs/JobStatusPill.vue`.
- Create `apps/frontend/src/components/jobs/JobsToolbar.vue`.
- Create `apps/frontend/src/components/jobs/JobsTable.vue`.
- Create `apps/frontend/src/views/JobsList.vue`.

---

## Task 1: Backend — applicant count on the jobs list

**Files:**
- Modify: `apps/backend/src/jobs/jobs.service.ts:42-81` (`findAll`)
- Test: `apps/backend/src/jobs/jobs.service.spec.ts` (create)

**Interfaces:**
- Produces: `findAll(query, companyId)` returns `{ data: Array<Job & { applicationCount: number }>, total, page, pageSize, totalPages }`.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/jobs/jobs.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JobsService.findAll', () => {
  let service: JobsService;
  let prisma: {
    $transaction: jest.Mock;
    job: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      job: { findMany: jest.fn(), count: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(JobsService);
  });

  it('flattens _count.applications to applicationCount on each row', async () => {
    prisma.$transaction.mockResolvedValue([
      [
        { id: 'j1', title: 'A', _count: { applications: 3 } },
        { id: 'j2', title: 'B', _count: { applications: 0 } },
      ],
      2,
    ]);

    const result = await service.findAll(
      { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' } as never,
      'company-1',
    );

    expect(result.total).toBe(2);
    expect(result.data[0]).toEqual({ id: 'j1', title: 'A', applicationCount: 3 });
    expect(result.data[1]).toEqual({ id: 'j2', title: 'B', applicationCount: 0 });
    expect(result.data[0]).not.toHaveProperty('_count');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest jobs.service`
Expected: FAIL — `data[0]` still has `_count`, no `applicationCount`.

- [ ] **Step 3: Implement the mapping**

In `apps/backend/src/jobs/jobs.service.ts`, change the `findMany` call inside the `$transaction` to include the count, and map the result before returning. Replace the `$transaction` + `return` block (lines 64-80):

```ts
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        include: { _count: { select: { applications: true } } },
      }),
      this.prisma.job.count({ where }),
    ]);

    const data = rows.map(({ _count, ...job }) => ({
      ...job,
      applicationCount: _count.applications,
    }));

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest jobs.service`
Expected: PASS.

- [ ] **Step 5: Update controller Swagger doc**

In `apps/backend/src/jobs/jobs.controller.ts`, update the list `@ApiResponse` description (line ~50) to:

```ts
  @ApiResponse({ status: 200, description: 'Paginated job list; each item includes applicationCount' })
```

- [ ] **Step 6: Verify the whole backend still builds + tests green**

Run: `cd apps/backend && npx jest && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/jobs/jobs.service.ts apps/backend/src/jobs/jobs.service.spec.ts apps/backend/src/jobs/jobs.controller.ts
git commit -m "feat(backend): include applicationCount on jobs list"
```

---

## Task 2: Frontend types + store actions

**Files:**
- Modify: `apps/frontend/src/types/job.ts`
- Modify: `apps/frontend/src/stores/jobs.store.ts`

**Interfaces:**
- Consumes: existing `Job`, `JobStatus`, `JobPayload` from `types/job.ts`; `api`, `getApiErrorMessage` from `@/plugins/axios`.
- Produces:
  - `JobListItem = Job & { applicationCount: number }`
  - `JobListResponse = { data: JobListItem[]; total; page; pageSize; totalPages }`
  - `JobListQuery = { page?; pageSize?; status?: JobStatus; search?; sortBy?: 'createdAt'|'title'|'publishedAt'; sortOrder?: 'asc'|'desc' }`
  - store: `fetchJobs(query: JobListQuery): Promise<JobListResponse>`, `deleteJob(id: string): Promise<void>`, `setJobStatus(id: string, status: JobStatus): Promise<Job>`

- [ ] **Step 1: Add types**

Append to `apps/frontend/src/types/job.ts`:

```ts
export interface JobListItem extends Job {
  applicationCount: number
}

export interface JobListResponse {
  data: JobListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface JobListQuery {
  page?: number
  pageSize?: number
  status?: JobStatus
  search?: string
  sortBy?: 'createdAt' | 'title' | 'publishedAt'
  sortOrder?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Add store actions**

In `apps/frontend/src/stores/jobs.store.ts`: extend the import on line 4 and add the three actions before the `return`, then export them.

Change line 4 to:

```ts
import type { Job, JobPayload, JobStatus, JobListQuery, JobListResponse } from '@/types/job'
```

Add inside the store (after `fetchJob`):

```ts
  async function fetchJobs(query: JobListQuery = {}): Promise<JobListResponse> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string | number> = {}
      if (query.page) params.page = query.page
      if (query.pageSize) params.pageSize = query.pageSize
      if (query.status) params.status = query.status
      if (query.search) params.search = query.search
      if (query.sortBy) params.sortBy = query.sortBy
      if (query.sortOrder) params.sortOrder = query.sortOrder
      const { data } = await api.get<JobListResponse>('/jobs', { params })
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load jobs.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function setJobStatus(id: string, status: JobStatus): Promise<Job> {
    return updateJob(id, { status })
  }

  async function deleteJob(id: string): Promise<void> {
    saving.value = true
    error.value = null
    try {
      await api.delete(`/jobs/${id}`)
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to delete job.')
      throw e
    } finally {
      saving.value = false
    }
  }
```

Change the `return` (line 53) to include them:

```ts
  return { saving, loading, error, createJob, updateJob, fetchJob, fetchJobs, setJobStatus, deleteJob }
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/types/job.ts apps/frontend/src/stores/jobs.store.ts
git commit -m "feat(frontend): jobs list types + store fetchJobs/delete/setStatus"
```

---

## Task 3: JobStatusPill component + route

**Files:**
- Create: `apps/frontend/src/components/jobs/JobStatusPill.vue`
- Modify: `apps/frontend/src/router/index.ts:43-46`

**Interfaces:**
- Consumes: `JobStatus` from `types/job.ts`.
- Produces: `<JobStatusPill :status="JobStatus" />`.

- [ ] **Step 1: Create the pill**

`apps/frontend/src/components/jobs/JobStatusPill.vue`:

```vue
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
```

- [ ] **Step 2: Swap the route**

In `apps/frontend/src/router/index.ts`, replace lines 41-46 (the comment + `/jobs` redirect block) with:

```ts
        {
          path: '/jobs',
          name: 'jobs',
          component: () => import('@/views/JobsList.vue'),
        },
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: FAIL — `@/views/JobsList.vue` does not exist yet. This is expected; it's resolved in Task 6. (If you want a clean intermediate typecheck, temporarily skip Step 3 here and run it after Task 6.)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/jobs/JobStatusPill.vue apps/frontend/src/router/index.ts
git commit -m "feat(frontend): JobStatusPill + /jobs list route"
```

---

## Task 4: JobsToolbar component

**Files:**
- Create: `apps/frontend/src/components/jobs/JobsToolbar.vue`

**Interfaces:**
- Consumes: `JobStatus`; `SegmentedTabs`, `AppButton`, `HfIcon`.
- Produces: `<JobsToolbar :search :status @update:search @update:status @new />` where `status` is `JobStatus | 'ALL'`.

- [ ] **Step 1: Create the toolbar**

`apps/frontend/src/components/jobs/JobsToolbar.vue`:

```vue
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
```

Note: `SegmentedTabs` requires the value to always match an option; `'ALL'` is a valid option here, so `mandatory` selection holds.

- [ ] **Step 2: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: still FAIL only on missing `JobsList.vue` (resolved Task 6). No new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/jobs/JobsToolbar.vue
git commit -m "feat(frontend): JobsToolbar (search + status tabs + new job)"
```

---

## Task 5: JobsTable component

**Files:**
- Create: `apps/frontend/src/components/jobs/JobsTable.vue`

**Interfaces:**
- Consumes: `JobListItem`, `JobStatus`, `JOB_TYPE_LABELS`; `JobStatusPill`, `HfIcon`; Vuetify `v-menu`, `v-list`.
- Produces: `<JobsTable :jobs :loading :total :page :page-size :sort-by :sort-order @sort @page @row-click @action />`
  - `@sort` payload: `'title' | 'publishedAt'`
  - `@page` payload: `number`
  - `@row-click` payload: `JobListItem`
  - `@action` payload: `{ type: 'publish'|'close'|'reopen'|'delete'|'edit'; job: JobListItem }`

- [ ] **Step 1: Create the table**

`apps/frontend/src/components/jobs/JobsTable.vue`:

```vue
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
        <tr v-if="loading" v-for="n in pageSize" :key="`sk-${n}`" class="skeleton-row">
          <td><div class="sk sk-job" /></td>
          <td><div class="sk sk-pill" /></td>
          <td><div class="sk sk-num" /></td>
          <td><div class="sk sk-date" /></td>
          <td></td>
        </tr>

        <!-- data rows -->
        <tr v-else v-for="job in jobs" :key="job.id" class="row" @click="emit('row-click', job)">
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
                <v-list-item v-for="a in actionsFor(job)" :key="a.type" @click="emit('action', { type: a.type, job })">
                  <v-list-item-title :class="{ danger: a.type === 'delete' }">{{ a.label }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </td>
        </tr>

        <!-- empty state -->
        <tr v-if="!loading && jobs.length === 0">
          <td colspan="5">
            <div class="empty">No jobs match your filters.</div>
          </td>
        </tr>
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
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: still FAIL only on missing `JobsList.vue`. No new errors from this file. (Note: `v-for` with `v-if` on the same `<tr>` for skeletons is acceptable here since the branches are mutually exclusive via the outer `v-if="loading"`/`v-else`.)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/jobs/JobsTable.vue
git commit -m "feat(frontend): JobsTable (rows, skeleton, sort, actions menu, pagination)"
```

---

## Task 6: JobsList container (wires everything)

**Files:**
- Create: `apps/frontend/src/views/JobsList.vue`

**Interfaces:**
- Consumes: `useJobsStore` (`fetchJobs`, `setJobStatus`, `deleteJob`, `loading`), `JobsToolbar`, `JobsTable`, router; `JobListItem`, `JobListResponse`, `JobStatus`.

- [ ] **Step 1: Create the view**

`apps/frontend/src/views/JobsList.vue`:

```vue
<template>
  <div class="jobs-page">
    <JobsToolbar
      :search="search"
      :status="statusFilter"
      @update:search="onSearch"
      @update:status="onStatus"
      @new="router.push('/jobs/new')"
    />

    <JobsTable
      :jobs="response.data"
      :loading="store.loading"
      :total="response.total"
      :page="page"
      :page-size="pageSize"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @sort="onSort"
      @page="onPage"
      @row-click="(j) => router.push(`/jobs/${j.id}/edit`)"
      @action="onAction"
    />

    <!-- delete confirm -->
    <v-dialog v-model="confirmOpen" max-width="420">
      <v-card class="confirm-card">
        <div class="confirm-title">Delete this job?</div>
        <p class="confirm-body">
          “{{ pendingDelete?.title }}” will be removed. Existing applications are kept but the job is hidden.
        </p>
        <div class="confirm-actions">
          <AppButton variant="ghost" @click="confirmOpen = false">Cancel</AppButton>
          <AppButton variant="primary" :loading="store.saving" @click="doDelete">Delete</AppButton>
        </div>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.open" :timeout="2600" location="bottom right">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '@/stores/jobs.store'
import type { JobListItem, JobListResponse, JobStatus } from '@/types/job'
import JobsToolbar from '@/components/jobs/JobsToolbar.vue'
import JobsTable from '@/components/jobs/JobsTable.vue'
import AppButton from '@/components/common/AppButton.vue'

type StatusFilter = JobStatus | 'ALL'
type SortBy = 'createdAt' | 'title' | 'publishedAt'

const router = useRouter()
const store = useJobsStore()

const pageSize = 10
const page = ref(1)
const search = ref('')
const statusFilter = ref<StatusFilter>('ALL')
const sortBy = ref<SortBy>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const response = ref<JobListResponse>({ data: [], total: 0, page: 1, pageSize, totalPages: 0 })

const confirmOpen = ref(false)
const pendingDelete = ref<JobListItem | null>(null)
const snack = reactive({ open: false, text: '' })

function notify(text: string) {
  snack.text = text
  snack.open = true
}

async function load() {
  try {
    response.value = await store.fetchJobs({
      page: page.value,
      pageSize,
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      search: search.value.trim() || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
  } catch {
    notify(store.error ?? 'Failed to load jobs.')
  }
}

// debounce search
let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch(value: string) {
  search.value = value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}

function onStatus(value: StatusFilter) {
  statusFilter.value = value
  page.value = 1
  load()
}

function onSort(key: 'title' | 'publishedAt') {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
  page.value = 1
  load()
}

function onPage(next: number) {
  page.value = next
  load()
}

async function onAction(e: { type: 'publish' | 'close' | 'reopen' | 'delete' | 'edit'; job: JobListItem }) {
  if (e.type === 'edit') {
    router.push(`/jobs/${e.job.id}/edit`)
    return
  }
  if (e.type === 'delete') {
    pendingDelete.value = e.job
    confirmOpen.value = true
    return
  }
  const status: JobStatus = e.type === 'close' ? 'CLOSED' : 'PUBLISHED'
  try {
    await store.setJobStatus(e.job.id, status)
    notify(e.type === 'publish' ? 'Job published.' : e.type === 'close' ? 'Job closed.' : 'Job reopened.')
    load()
  } catch {
    notify(store.error ?? 'Action failed.')
  }
}

async function doDelete() {
  if (!pendingDelete.value) return
  try {
    await store.deleteJob(pendingDelete.value.id)
    confirmOpen.value = false
    notify('Job deleted.')
    load()
  } catch {
    notify(store.error ?? 'Failed to delete job.')
  }
}

watch(() => null, () => {}, {}) // no-op to keep imports tidy if needed
load()
</script>

<style scoped>
.jobs-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.confirm-card {
  padding: 22px;
  border-radius: 12px;
}
.confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--hf-text);
}
.confirm-body {
  margin: 8px 0 18px;
  font-size: 13.5px;
  color: var(--hf-text-muted);
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
```

Remove the `watch(() => null, ...)` no-op line if it triggers a lint warning — it's only a guard against an unused-import edge case and is not required.

- [ ] **Step 2: Full typecheck (now clean)**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0 (JobsList.vue now exists; Tasks 3–5 references resolve).

- [ ] **Step 3: Verify AppButton accepts a `loading` prop and `variant` values used**

Run: `grep -n "loading\|variant\|primary\|ghost" apps/frontend/src/components/common/AppButton.vue | head`
Expected: confirms `variant` supports `'primary'` and `'ghost'` and a `loading` prop exists. If the prop names differ, adjust the `AppButton` usages in JobsToolbar/JobsList to match the real API before committing.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/views/JobsList.vue
git commit -m "feat(frontend): JobsList container wiring filters, actions, pagination"
```

---

## Task 7: Manual end-to-end verification + docs

**Files:**
- Modify: `CLAUDE.md` (What's done so far — add the jobs list bullet)

- [ ] **Step 1: Start the stack**

Backend: `cd apps/backend && npm run start:dev` (port 3200). Frontend: `cd apps/frontend && npm run dev` (5173). Sign in as a recruiter with at least 2–3 jobs in mixed statuses (create via `/jobs/new` if needed).

- [ ] **Step 2: Walk the verification checklist** (from the spec)

1. Navigate to `/jobs` — skeleton rows show during fetch, then real rows.
2. Type in search — results filter by title and by location after ~300ms; page resets to 1.
3. Click status tabs (All / Draft / Published / Closed) — list filters; counts of rows change.
4. Click "Job" and "Opened" headers — caret toggles, order flips, rows reorder.
5. Prev/Next — page changes, "Showing X of N" stays accurate, buttons disable at bounds.
6. Three-dot menu per row:
   - Draft job → Publish → pill turns green, snackbar "Job published."
   - Published job → Close → pill turns grey "Closed".
   - Closed job → Reopen → back to Published.
   - Any job → Edit → routes to `/jobs/:id/edit`.
   - Any job → Delete → confirm dialog → confirm → row disappears, total drops, snackbar.
7. Applicants column shows real numbers (matches DB).
8. Filter to a status with no jobs → empty state renders.

- [ ] **Step 3: Record results**

If all pass, note it. If anything fails, fix in the relevant task's files and re-verify before continuing.

- [ ] **Step 4: Update CLAUDE.md**

Add a bullet under "What's done so far" summarizing the jobs list screen (endpoint reused + `applicationCount` backend add, JobsList/JobsToolbar/JobsTable/JobStatusPill, server pagination, all actions wired, loading skeletons) and update "Where I'm at" to mark the jobs list screen done.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark recruiter jobs list screen complete"
```

---

## Self-Review Notes

- **Spec coverage:** backend applicationCount (Task 1), types+store (Task 2), route+pill (Task 3), toolbar search/status (Task 4), table with sort/pagination/actions/skeleton/empty (Task 5), container wiring delete-dialog/snackbar/debounce (Task 6), e2e + docs (Task 7). All spec sections mapped.
- **Type consistency:** `fetchJobs`/`setJobStatus`/`deleteJob`, `JobListItem`/`JobListResponse`/`JobListQuery`, and the `@action` payload union are used identically across Tasks 2/5/6.
- **Known intermediate-state note:** the `/jobs` route (Task 3) references `JobsList.vue` which is created in Task 6, so typechecks in Tasks 3–5 fail only on that missing import; the first fully-clean frontend typecheck is Task 6 Step 2. This is intentional ordering, called out in each step.
- **Assumption to verify at build time:** `AppButton`'s prop API (`variant`, `loading`) — Task 6 Step 3 checks it explicitly and adjusts if names differ.
