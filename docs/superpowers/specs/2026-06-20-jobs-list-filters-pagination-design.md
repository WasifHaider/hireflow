# Jobs List — Flat Tabs, Functional Filters, Custom Pagination

**Date:** 2026-06-20
**Branch:** feat/recruiter-dashboard-integration
**Status:** Approved (design)

## Problem

The built recruiter Jobs List (`/jobs`) deviates from the design mockup
(`screens/jobs_list.jsx`) in three ways:

1. **Tab row** uses pill-style `SegmentedTabs` (v-btn-toggle). Design uses a flat
   text tab row (`hf-tab-row`) with a mono count beside each label.
2. **Filter section** is inaccurate — only a search box exists. Design has, right of
   search: a **Filters** popover (with active-count badge), an **Owner** dropdown, and
   a **Columns** toggle. User wants these functional.
3. **Pagination** uses Vuetify's `v-data-table-server` footer. Design has a custom
   footer (`Showing N of T jobs` ··· `Rows per page: N ▾`). Build a reusable custom
   pagination component.

Status tabs map to our 3-state enum (DRAFT / PUBLISHED / CLOSED), not the design's
6 states (no Open/Closing soon/Paused). So 4 tabs: All / Draft / Published / Closed.

## Enum mapping (source of truth — note the names are counter-intuitive)

- `JobType` = `REMOTE | HYBRID | ONSITE` → presented as **Work mode**.
- `EmploymentType` = `FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP` → presented as **Job type**.

## Backend changes (`apps/backend/src/jobs/`)

### 1. `ListJobsQueryDto` — new optional filter params
Add, all optional, AND-combined into the existing `where`:
- `department?: string`
- `location?: string` (exact match; distinct from the free-text `search` which is a `contains` on title+location)
- `jobType?: JobType` (Work mode)
- `employmentType?: EmploymentType` (Job type)
- `ownerId?: string` (UUID → `createdById`)

Tenant isolation untouched (`companyId` + `deletedAt: null` always applied).

### 2. `findAll` — faceted status counts + owner in each row
- Build a `baseWhere` = company + deletedAt + search + the 4 filter dims + ownerId,
  **excluding `status`**. The paged query applies `status` on top of `baseWhere`.
- Compute `counts` with a single `groupBy(['status'], { where: baseWhere, _count })`,
  then zero-fill DRAFT/PUBLISHED/CLOSED and sum for `all`. Counts reflect search +
  filters but NOT the active status tab (faceted), so switching tabs doesn't move them.
- Add `createdBy: { select: { id, fullName, avatarUrl } }` to the row `include`; map
  it onto each row as `owner: { id, fullName, avatarUrl }`. No `passwordHash`/`email` leak.
- Response gains `counts: { all, DRAFT, PUBLISHED, CLOSED }` alongside existing fields.

### 3. `GET /jobs/facets` — populate dropdown options
New endpoint returning, for the current company (non-deleted jobs only):
- `departments: string[]` — distinct non-null departments, sorted.
- `locations: string[]` — distinct non-null locations, sorted.
- `owners: { id, fullName, avatarUrl }[]` — distinct creators of the company's jobs.

(jobType/employmentType options are static enums — frontend hard-codes them, no API.)

**Route ordering caveat:** declare `@Get('facets')` BEFORE `@Get(':id')` in the
controller, else `facets` is captured by the `:id` `ParseUUIDPipe` → 400.

### 4. Tests
Extend `jobs.service.spec.ts` (mocked Prisma): faceted counts zero-fill, filter params
flow into `where`, facets distinct+sorted. Keep existing tenant-isolation tests green.

## Frontend changes (`apps/frontend/`)

### Types (`src/types/job.ts`)
- `JobListItem` gains `owner: { id; fullName; avatarUrl: string | null }`.
- `JobListResponse` gains `counts: { all; DRAFT; PUBLISHED; CLOSED }`.
- `JobListQuery` gains `department?`, `location?`, `jobType?`, `employmentType?`, `ownerId?`.
- New `JobFacets` type + `EMPLOYMENT_TYPE_LABELS` (Job type labels) reusing existing
  `JOB_TYPE_LABELS` (Work mode labels).

### Store (`src/stores/jobs.store.ts`)
- `fetchJobs` passes the new params; returns `counts`.
- New `fetchFacets()` action → `GET /jobs/facets`, cached in store state.

### Toolbar — break `JobsToolbar.vue` into focused pieces
- `JobsTabRow.vue` (new) — flat `hf-tab-row` tabs (All/Draft/Published/Closed) with mono
  counts from `response.counts`. Active = indigo text + 2px underline. Replaces SegmentedTabs.
- `JobsFiltersMenu.vue` (new) — `Filters` ghost button + active-count badge → `v-menu`
  popover with 4 `AppField` selects (Department, Location from facets; Work mode, Job type
  from static enums) + **Apply** / **Clear all**. Badge = number of set dimensions.
- `JobsOwnerMenu.vue` (new) — `Owner: All ▾` ghost button → `v-menu` list of facet owners +
  "All". Selecting filters by `ownerId`.
- `JobsColumnsMenu.vue` (new) — columns icon ghost button → `v-menu` checkboxes toggling
  Status / Applicants / Opened / Owner (Job + actions always shown). Persist the hidden-set
  in `localStorage` (`hf.jobs.hiddenCols`).
- `JobsToolbar.vue` keeps the header (h1 + New job) and lays out: tab row (left) ···
  search + Filters + Owner + Columns (right), matching the design row.

### Table (`JobsTable.vue`)
- Add an **Owner** column (avatar from `avatarUrl` or initials of `fullName` + first name).
- Honor the visible-columns set from `JobsColumnsMenu` (hide via filtered `columns`).

### Custom pagination (`src/components/common/AppPagination.vue` — new, reusable)
- Props: `total`, `page`, `pageSize`, `pageSizeOptions`. Emits `update:page`, `update:pageSize`.
- Layout (hf footer style): left `Showing <a>–<b></a> of <total> jobs`; right
  `Rows per page: [v-select 10/25/50]` + prev/next chevron buttons (disabled at ends).
- `AppDataTable.vue` gains `hide-default-footer` always-on in server mode + a `#footer`
  slot (or the caller renders `AppPagination` below the table). `JobsList.vue` renders
  `AppPagination` wired to its existing page/pageSize state.

### `JobsList.vue`
- Hold filter state (`department/location/jobType/employmentType/ownerId`), pass to `load()`.
- Resetting to page 1 on any filter/search/status change (existing pattern).
- Load facets on mount alongside the first job fetch.

## Out of scope (YAGNI)
- Multi-value per filter dimension (single value each; badge counts set dims).
- Design's Export CSV / Share careers page buttons, top-fits column, pinned, board toggle.
- Persisting filter/owner selection across reloads (only column visibility persists).

## Verification
- Backend: `npm test` (jobs spec), `npx tsc --noEmit`.
- Frontend: `npx vue-tsc --noEmit -p tsconfig.app.json`.
- Manual e2e (logged-in recruiter): tabs+counts, each filter narrows list, owner filter,
  column toggle persists, pagination prev/next + rows-per-page.
