# Recruiter Jobs List — Design Spec

**Date:** 2026-06-20
**Branch:** feat/recruiter-dashboard-integration
**Status:** Approved (design)

## Context

The recruiter app has a job-creation wizard (`/jobs/new`, `/jobs/:id/edit`) but no jobs **list** screen — `/jobs` currently redirects to `/jobs/new`. Recruiters need a screen to see every job they've posted, filter/search it, and act on each job (edit, publish, close, delete). This spec covers building that screen, fully wired to the backend, with every filter, search, and action working against real endpoints. The mockup (`screens/jobs_list.jsx`) is aspirational; this spec scopes to what the backend can actually back, plus one small backend addition (applicant count).

## Goals

- A `/jobs` list screen, pixel-matched to the mockup where data exists.
- Search (title + location), status filter, and column sorting — all server-driven.
- Per-job actions — edit, publish, close, reopen, delete — all hitting real endpoints.
- Server-side pagination.
- A visible loading state whenever a fetch is in flight (standing project rule).

## Non-Goals (dropped — no backend support)

Stats strip (Open roles / Total applicants / Top fits / Median time), top-fit scores, job owner, pinned jobs, board-view toggle, per-status-tab counts, "+N new" applicant badge.

## Backend Change

**File:** `apps/backend/src/jobs/jobs.service.ts` (`findAll`)

Add an application count to each list row:

```ts
this.prisma.job.findMany({
  where,
  // ...existing pagination/sort
  include: { _count: { select: { applications: true } } },
})
```

Map each row so the API returns `applicationCount: number` alongside the existing job fields (flatten `_count.applications` → `applicationCount`; do not leak the raw `_count` shape). The count query stays inside the existing `$transaction` with the total count.

- Update the list response type/DTO and Swagger `@ApiResponse` to document `applicationCount`.
- Tenant isolation unchanged (`where` already filters `companyId` + `deletedAt: null`).
- Existing Jest unit tests for `findAll` updated to assert the mapped `applicationCount`.

No change to the GET `/jobs` query params — `page`, `pageSize`, `status`, `search`, `sortBy` (createdAt|title|publishedAt), `sortOrder` (asc|desc) already exist and cover all needs.

## Frontend

### Types — `apps/frontend/src/types/job.ts`

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

`JobStatus` already exists: `'DRAFT' | 'PUBLISHED' | 'CLOSED'`.

### Store — `apps/frontend/src/stores/jobs.store.ts`

Add (reusing existing `loading`/`error` refs and `getApiErrorMessage`):

```ts
async function fetchJobs(query: JobListQuery): Promise<JobListResponse>
```

- `GET /jobs` with query params (omit undefined/empty).
- Sets `loading` true/false around the call; sets `error` on failure.
- `deleteJob(id)`, `publishJob(id)` / `closeJob(id)` / `reopenJob(id)` — the status ones are thin wrappers over the existing `updateJob(id, { status })`; `deleteJob` calls `DELETE /jobs/:id`. Reuse the existing `saving` ref for mutations.

### Route — `apps/frontend/src/router/index.ts`

Replace the `{ path: '/jobs', redirect: '/jobs/new' }` entry with:

```ts
{ path: '/jobs', name: 'jobs', component: () => import('@/views/JobsList.vue') }
```

(Stays a child of the pathless `RecruiterLayout` parent.)

### Components (all Vuetify-first, reuse shared atoms)

**`views/JobsList.vue`** — container. Owns reactive filter state `{ status, search, sortBy, sortOrder, page, pageSize }`, the `JobListResponse`, and `loading`. On mount and on any filter/sort/page change → `fetchJobs`. Debounces search (~300 ms) and resets `page` to 1 on filter/search/sort change. Holds the delete-confirm `v-dialog` and a `v-snackbar` for action feedback. Passes data + handlers down to toolbar and table.

**`components/jobs/JobsToolbar.vue`** — "Jobs" `hf-h1` title + subtitle; **New job** primary button (`AppButton`, → `/jobs/new`); a debounced search input (`AppField` text or `v-text-field` with search icon, `HfIcon name="search"`); status filter via `SegmentedTabs` with options All / Draft / Published / Closed (All = no status param). Emits `update:search` and `update:status`.

**`components/jobs/JobsTable.vue`** — the table, styled with existing `.hf-table` classes for pixel match:
- Columns: **Job** (gradient initial avatar from title + first letter; title; subtitle = `department · location · salary`), **Status** (`JobStatusPill`), **Applicants** (`applicationCount`), **Opened** (`publishedAt ?? createdAt`, formatted), **actions** (three-dot `v-icon`/`HfIcon` button opening a `v-menu`).
- **Sortable headers**: Title (`sortBy: 'title'`) and Opened (`sortBy: 'publishedAt'`); clicking toggles `sortOrder`, emits to container, shows an active-sort caret. Default `createdAt` desc.
- **Row click** → navigate to `/jobs/:id/edit`.
- **`v-menu` per row** — actions vary by status:
  - DRAFT → Publish, Edit, Delete
  - PUBLISHED → Close, Edit, Delete
  - CLOSED → Reopen, Edit, Delete
  Each emits an event the container handles.
- **Loading state**: when `loading`, render ~`pageSize` skeleton rows (grey shimmer blocks matching the column layout) instead of data — never a blank/frozen table.
- **Empty state**: when not loading and `data.length === 0`, a centered message ("No jobs yet" / "No jobs match your filters") with a New-job CTA when no filters are active.
- **Pagination footer** (`.hf-surface-alt` bar): "Showing `{data.length}` of `{total}` jobs" + Prev/Next buttons (disabled at bounds) driving the container's `page`.

**`components/jobs/JobStatusPill.vue`** — maps `JobStatus` → mockup pill styles:
- PUBLISHED → green (`bg #ECFDF5`, text `#047857`, border `#A7F3D0`, green dot) labelled "Published"
- DRAFT → grey (`bg --hf-bg`, text `--hf-text-muted`, border `--hf-border`, dot `#94A3B8`) labelled "Draft"
- CLOSED → neutral grey, subtle dot, labelled "Closed"
- Pill: `inline-flex`, `gap 6px`, `padding 3px 9px`, `border-radius 99px`, `font 11.5px/500`, 6px dot.

### Loading-state rule (standing)

Per project rule, every fetch shows a loading state. Here: skeleton rows in the table while `loading`; the New-job button is unaffected, but mutation buttons (publish/close/delete confirm) show a `loading`/disabled state via the `saving` ref while their request is in flight.

## Data Flow

```
JobsList (state: filters, page, response, loading)
  ├─ JobsToolbar  → emits search/status changes → reset page → fetchJobs
  ├─ JobsTable    → emits sort/page/action events
  │     row-click → router push edit
  │     action    → publish/close/reopen/delete → store mutation → refetch + snackbar
  └─ store.fetchJobs(query) → GET /jobs → JobListResponse
```

## Error Handling

- `fetchJobs` failure → `error` set, table shows an inline error row + retry; snackbar optional.
- Mutation failure → snackbar with `getApiErrorMessage`; no optimistic update (refetch on success only).
- 401 already handled globally by the axios interceptor.

## Testing / Verification

- **Backend:** update + run Jest unit tests for `findAll` (mocked Prisma) asserting `applicationCount` mapping; `npm run build` / typecheck clean.
- **Frontend:** `npx vue-tsc --noEmit -p tsconfig.app.json` green.
- **Manual e2e** (`npm run dev`, recruiter logged in, `/jobs`):
  1. List loads; skeleton shows during fetch.
  2. Search by title and by location filters results (debounced, page resets).
  3. Status tabs filter correctly (All/Draft/Published/Closed).
  4. Sort by Title and Opened toggles asc/desc and reorders.
  5. Pagination Prev/Next changes pages; "Showing X of N" accurate.
  6. Each action works: Publish (Draft→Published, pill turns green), Close (→Closed), Reopen (→Published), Delete (confirm → row gone, count drops), Edit (→ edit form). Snackbar confirms each.
  7. Applicants column shows real counts.
  8. Empty state renders with no jobs / no matches.

## Files

**Backend:** `apps/backend/src/jobs/jobs.service.ts` (+ list response DTO/type, controller Swagger, `findAll` unit test).
**Frontend:** `src/types/job.ts`, `src/stores/jobs.store.ts`, `src/router/index.ts`, `src/views/JobsList.vue`, `src/components/jobs/{JobsToolbar,JobsTable,JobStatusPill}.vue`.
