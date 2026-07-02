# Jobs List — Flat Tabs, Functional Filters, Custom Pagination — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the recruiter Jobs List match the design mockup — flat tab row with faceted counts, a functional Filters/Owner/Columns toolbar, an Owner column, and a custom reusable pagination footer replacing Vuetify's.

**Architecture:** Backend extends `GET /jobs` with filter params + faceted status counts + per-row owner, and adds `GET /jobs/facets` for dropdown options. Frontend swaps the pill `SegmentedTabs` for a flat `hf-tab-row`, adds three `v-menu` popovers (Filters/Owner/Columns) and a reusable `AppPagination` component, and threads filter state through `JobsList.vue`.

**Tech Stack:** NestJS + Prisma (backend), Vue 3 + Vuetify 3 + Pinia + TypeScript (frontend), Jest (backend tests).

## Global Constraints

- Tenant isolation: every job query filters by `companyId` derived from JWT (`user.companyId`), never request body. Always include `deletedAt: null`.
- Never leak sensitive User fields — owner select is `{ id, fullName, avatarUrl }` only (no email/passwordHash).
- Swagger decorators on every new/changed endpoint (`@ApiOperation`, `@ApiResponse`).
- No `any` without justification. Proper TS types both sides.
- Every fetch shows a loading state (project rule).
- Enum mapping (counter-intuitive): `JobType` = REMOTE/HYBRID/ONSITE = **Work mode**; `EmploymentType` = FULL_TIME/PART_TIME/CONTRACT/INTERNSHIP = **Job type**.
- Backend tests: `cd apps/backend && npm test`. Backend typecheck: `cd apps/backend && npx tsc --noEmit`. Frontend typecheck: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`.
- Route order: `@Get('facets')` MUST precede `@Get(':id')` in the controller.

---

### Task 1: Backend — filter params on ListJobsQueryDto

**Files:**
- Modify: `apps/backend/src/jobs/dto/list-jobs-query.dto.ts`

**Interfaces:**
- Produces: `ListJobsQueryDto` with optional `department?: string`, `location?: string`, `jobType?: JobType`, `employmentType?: EmploymentType`, `ownerId?: string`.

- [ ] **Step 1: Add the five optional filter fields**

Add imports for `JobType`, `EmploymentType` from `@prisma/client` (extend existing `JobStatus` import) and `IsUUID` from `class-validator`. Append to the class:

```typescript
  @ApiPropertyOptional({ description: 'Exact department match' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Exact location match' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: JobType, description: 'Work mode' })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Employment / job type' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Filter by job creator (owner) user id' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/jobs/dto/list-jobs-query.dto.ts
git commit -m "feat(backend): add filter params to jobs list query dto"
```

---

### Task 2: Backend — faceted counts + owner + filters in findAll (TDD)

**Files:**
- Modify: `apps/backend/src/jobs/jobs.service.ts:42-87`
- Test: `apps/backend/src/jobs/jobs.service.spec.ts`

**Interfaces:**
- Consumes: `ListJobsQueryDto` (Task 1).
- Produces: `findAll` return shape adds `counts: { all: number; DRAFT: number; PUBLISHED: number; CLOSED: number }`; each row in `data` gains `owner: { id: string; fullName: string; avatarUrl: string | null }`.

- [ ] **Step 1: Write failing tests**

Open `jobs.service.spec.ts`. Inspect the existing Prisma mock (it mocks `prisma.job.findMany`, `prisma.job.count`, `prisma.$transaction`). Add a `prisma.job.groupBy` mock to the mock object. Add tests:

```typescript
describe('findAll faceted counts + owner + filters', () => {
  it('zero-fills status counts and sums all', async () => {
    prisma.job.findMany.mockResolvedValue([]);
    prisma.job.count.mockResolvedValue(0);
    prisma.job.groupBy.mockResolvedValue([
      { status: 'PUBLISHED', _count: { _all: 3 } },
      { status: 'DRAFT', _count: { _all: 1 } },
    ] as any);
    prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

    const res = await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' } as any, 'company-1');

    expect(res.counts).toEqual({ all: 4, DRAFT: 1, PUBLISHED: 3, CLOSED: 0 });
  });

  it('maps createdBy onto owner and flattens', async () => {
    prisma.job.findMany.mockResolvedValue([
      { id: 'j1', title: 'X', _count: { applications: 2 }, createdBy: { id: 'u1', fullName: 'Jamie Rivera', avatarUrl: null } },
    ] as any);
    prisma.job.count.mockResolvedValue(1);
    prisma.job.groupBy.mockResolvedValue([{ status: 'PUBLISHED', _count: { _all: 1 } }] as any);
    prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

    const res = await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' } as any, 'company-1');

    expect(res.data[0].owner).toEqual({ id: 'u1', fullName: 'Jamie Rivera', avatarUrl: null });
    expect(res.data[0].applicationCount).toBe(2);
    expect((res.data[0] as any).createdBy).toBeUndefined();
  });

  it('passes filter dims into the where clause', async () => {
    prisma.job.findMany.mockResolvedValue([]);
    prisma.job.count.mockResolvedValue(0);
    prisma.job.groupBy.mockResolvedValue([] as any);
    prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

    await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc', department: 'Engineering', jobType: 'REMOTE', ownerId: 'u9' } as any, 'company-1');

    const whereArg = prisma.job.findMany.mock.calls[0][0].where;
    expect(whereArg).toMatchObject({ companyId: 'company-1', deletedAt: null, department: 'Engineering', jobType: 'REMOTE', createdById: 'u9' });
  });

  it('counts exclude the active status tab (faceted)', async () => {
    prisma.job.findMany.mockResolvedValue([]);
    prisma.job.count.mockResolvedValue(0);
    prisma.job.groupBy.mockResolvedValue([] as any);
    prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

    await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc', status: 'PUBLISHED' } as any, 'company-1');

    const groupByWhere = prisma.job.groupBy.mock.calls[0][0].where;
    expect(groupByWhere.status).toBeUndefined();
    const findWhere = prisma.job.findMany.mock.calls[0][0].where;
    expect(findWhere.status).toBe('PUBLISHED');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npm test -- jobs.service`
Expected: FAIL (groupBy not called / owner undefined / counts missing).

- [ ] **Step 3: Rewrite findAll**

Replace `findAll` (lines 42-87) with:

```typescript
  async findAll(query: ListJobsQueryDto, companyId: string) {
    // baseWhere = everything EXCEPT status, so faceted counts are stable across tabs.
    const baseWhere: Prisma.JobWhereInput = { companyId, deletedAt: null };

    if (query.search) {
      baseWhere.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.department) baseWhere.department = query.department;
    if (query.location) baseWhere.location = query.location;
    if (query.jobType) baseWhere.jobType = query.jobType;
    if (query.employmentType) baseWhere.employmentType = query.employmentType;
    if (query.ownerId) baseWhere.createdById = query.ownerId;

    const where: Prisma.JobWhereInput = { ...baseWhere };
    if (query.status) where.status = query.status;

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [rows, total, grouped] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        include: {
          _count: { select: { applications: true } },
          createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.job.count({ where }),
      this.prisma.job.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    const counts = { all: 0, DRAFT: 0, PUBLISHED: 0, CLOSED: 0 };
    for (const g of grouped) {
      counts[g.status] = g._count._all;
      counts.all += g._count._all;
    }

    const data = rows.map(({ _count, createdBy, ...job }) => ({
      ...job,
      applicationCount: _count.applications,
      owner: createdBy,
    }));

    return {
      data,
      total,
      counts,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- jobs.service`
Expected: PASS (all, including pre-existing tenant tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/jobs/jobs.service.ts apps/backend/src/jobs/jobs.service.spec.ts
git commit -m "feat(backend): faceted status counts + owner + filters in jobs findAll"
```

---

### Task 3: Backend — GET /jobs/facets endpoint (TDD)

**Files:**
- Modify: `apps/backend/src/jobs/jobs.service.ts` (add `getFacets`)
- Modify: `apps/backend/src/jobs/jobs.controller.ts` (add route BEFORE `:id`)
- Test: `apps/backend/src/jobs/jobs.service.spec.ts`

**Interfaces:**
- Produces: `JobsService.getFacets(companyId: string): Promise<{ departments: string[]; locations: string[]; owners: { id: string; fullName: string; avatarUrl: string | null }[] }>`; route `GET /jobs/facets`.

- [ ] **Step 1: Write failing test**

```typescript
describe('getFacets', () => {
  it('returns distinct sorted departments/locations and distinct owners', async () => {
    prisma.job.findMany.mockResolvedValue([
      { department: 'Engineering', location: 'Austin, TX', createdBy: { id: 'u1', fullName: 'Jamie', avatarUrl: null } },
      { department: 'Design', location: 'Austin, TX', createdBy: { id: 'u2', fullName: 'Maya', avatarUrl: null } },
      { department: 'Engineering', location: 'Remote', createdBy: { id: 'u1', fullName: 'Jamie', avatarUrl: null } },
      { department: null, location: 'Remote', createdBy: { id: 'u1', fullName: 'Jamie', avatarUrl: null } },
    ] as any);

    const res = await service.getFacets('company-1');

    expect(res.departments).toEqual(['Design', 'Engineering']);
    expect(res.locations).toEqual(['Austin, TX', 'Remote']);
    expect(res.owners).toEqual([
      { id: 'u1', fullName: 'Jamie', avatarUrl: null },
      { id: 'u2', fullName: 'Maya', avatarUrl: null },
    ]);
    expect(prisma.job.findMany.mock.calls[0][0].where).toMatchObject({ companyId: 'company-1', deletedAt: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- jobs.service`
Expected: FAIL (`service.getFacets is not a function`).

- [ ] **Step 3: Implement getFacets**

Add to `JobsService`:

```typescript
  async getFacets(companyId: string) {
    const rows = await this.prisma.job.findMany({
      where: { companyId, deletedAt: null },
      select: {
        department: true,
        location: true,
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    const departments = [...new Set(rows.map((r) => r.department).filter((d): d is string => !!d))].sort();
    const locations = [...new Set(rows.map((r) => r.location).filter((l): l is string => !!l))].sort();
    const ownersMap = new Map<string, { id: string; fullName: string; avatarUrl: string | null }>();
    for (const r of rows) ownersMap.set(r.createdBy.id, r.createdBy);
    const owners = [...ownersMap.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));

    return { departments, locations, owners };
  }
```

- [ ] **Step 4: Add the controller route BEFORE `@Get(':id')`**

In `jobs.controller.ts`, insert directly after the `@Get()` `findAll` method and BEFORE `@Get(':id')`:

```typescript
  @Get('facets')
  @ApiOperation({ summary: 'Distinct departments, locations, and owners for filters' })
  @ApiResponse({ status: 200, description: 'Facet option lists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFacets(@CurrentUser() user: SafeUser) {
    return this.jobsService.getFacets(user.companyId);
  }
```

- [ ] **Step 5: Run tests + typecheck**

Run: `cd apps/backend && npm test -- jobs.service && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/jobs/jobs.service.ts apps/backend/src/jobs/jobs.controller.ts apps/backend/src/jobs/jobs.service.spec.ts
git commit -m "feat(backend): GET /jobs/facets for filter dropdowns"
```

---

### Task 4: Frontend — types + store

**Files:**
- Modify: `apps/frontend/src/types/job.ts`
- Modify: `apps/frontend/src/stores/jobs.store.ts`

**Interfaces:**
- Produces: `JobOwner`, `JobFacets`, `EMPLOYMENT_TYPE_LABELS`; `JobListItem.owner`; `JobListResponse.counts`; `JobListQuery` filter fields; store `fetchFacets()` + `facets` state; `fetchJobs` returns `counts`.

- [ ] **Step 1: Extend types**

In `src/types/job.ts` add (reuse existing `JobStatus`, `JobType`, `EmploymentType`, `JOB_TYPE_LABELS`):

```typescript
export interface JobOwner {
  id: string
  fullName: string
  avatarUrl: string | null
}

export interface JobFacets {
  departments: string[]
  locations: string[]
  owners: JobOwner[]
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
}
```

Add `owner: JobOwner` to `JobListItem`. Add `counts: { all: number; DRAFT: number; PUBLISHED: number; CLOSED: number }` to `JobListResponse`. Add to `JobListQuery`: `department?: string`, `location?: string`, `jobType?: JobType`, `employmentType?: EmploymentType`, `ownerId?: string`. (If `JobType`/`EmploymentType` enums aren't yet exported from this file, confirm their existing definition and reuse it.)

- [ ] **Step 2: Store — facets + counts**

In `jobs.store.ts` add `facets` to state (`ref<JobFacets>({ departments: [], locations: [], owners: [] })`) and an action:

```typescript
async function fetchFacets(): Promise<void> {
  const { data } = await api.get<JobFacets>('/jobs/facets')
  facets.value = data
}
```

Ensure `fetchFacets` and `facets` are returned from the store. Confirm `fetchJobs` already spreads query params into the request `params` — the new optional fields flow through automatically; no change needed beyond the type. Expose `facets`/`fetchFacets` in the return object.

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/types/job.ts apps/frontend/src/stores/jobs.store.ts
git commit -m "feat(frontend): job filter/owner/counts types + fetchFacets store action"
```

---

### Task 5: Frontend — AppPagination component

**Files:**
- Create: `apps/frontend/src/components/common/AppPagination.vue`
- Modify: `apps/frontend/src/components/common/AppDataTable.vue` (force `hide-default-footer` in server mode)

**Interfaces:**
- Produces: `AppPagination` with props `{ total: number; page: number; pageSize: number; pageSizeOptions?: number[] }`, emits `update:page` / `update:pageSize`.

- [ ] **Step 1: Create AppPagination.vue**

```vue
<template>
  <div class="hf-pagination">
    <span class="left">
      Showing <strong>{{ rangeStart }}–{{ rangeEnd }}</strong> of <strong>{{ total }}</strong> jobs
    </span>
    <div class="right">
      <span class="rpp-label">Rows per page:</span>
      <select class="rpp" :value="pageSize" @change="onSize">
        <option v-for="o in (pageSizeOptions ?? [10, 25, 50])" :key="o" :value="o">{{ o }}</option>
      </select>
      <button class="nav" :disabled="page <= 1" aria-label="Previous page" @click="emit('update:page', page - 1)">
        <HfIcon name="chevronLeft" :size="16" />
      </button>
      <button class="nav" :disabled="page >= totalPages" aria-label="Next page" @click="emit('update:page', page + 1)">
        <HfIcon name="chevronRight" :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from './HfIcon.vue'

const props = defineProps<{ total: number; page: number; pageSize: number; pageSizeOptions?: number[] }>()
const emit = defineEmits<{ 'update:page': [number]; 'update:pageSize': [number] }>()

const totalPages = computed(() => (props.total === 0 ? 1 : Math.ceil(props.total / props.pageSize)))
const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

function onSize(e: Event) {
  emit('update:pageSize', Number((e.target as HTMLSelectElement).value))
}
</script>

<style scoped>
.hf-pagination {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--hf-border);
  background: var(--hf-surface-alt);
  font-size: 12.5px;
  color: var(--hf-text-muted);
}
.hf-pagination strong { color: var(--hf-text); font-weight: 600; }
.right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.rpp {
  border: 1px solid var(--hf-border);
  border-radius: 7px;
  background: var(--hf-surface);
  color: var(--hf-text);
  font-size: 12.5px;
  padding: 3px 6px;
  cursor: pointer;
}
.nav {
  display: grid; place-items: center;
  width: 28px; height: 28px;
  border: 1px solid var(--hf-border);
  border-radius: 7px;
  background: var(--hf-surface);
  color: var(--hf-text-muted);
  cursor: pointer;
}
.nav:hover:not(:disabled) { background: var(--hf-bg); color: var(--hf-text); }
.nav:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
```

NOTE: confirm `HfIcon` has `chevronLeft` / `chevronRight`. If not, add them to `HfIcon.vue` (Lucide chevron paths) in this step.

- [ ] **Step 2: Suppress Vuetify footer in AppDataTable**

In `AppDataTable.vue`, the `v-data-table-server` currently has `:hide-default-footer="!server"`. Change to always hide: `hide-default-footer`. (The caller now owns pagination via `AppPagination`.) Verify no static-mode caller relied on the server footer — static mode already had it hidden, so this only removes the server-mode footer.

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/common/AppPagination.vue apps/frontend/src/components/common/AppDataTable.vue apps/frontend/src/components/common/HfIcon.vue
git commit -m "feat(frontend): reusable AppPagination + drop Vuetify data-table footer"
```

---

### Task 6: Frontend — JobsTabRow (flat tabs + counts)

**Files:**
- Create: `apps/frontend/src/components/jobs/JobsTabRow.vue`

**Interfaces:**
- Consumes: `JobListResponse.counts` (Task 4).
- Produces: `JobsTabRow` props `{ status: JobStatus | 'ALL'; counts: { all; DRAFT; PUBLISHED; CLOSED } }`, emits `update:status`.

- [ ] **Step 1: Create JobsTabRow.vue (match design hf-tab-row)**

```vue
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

<style scoped>
.hf-tab-row { display: flex; align-items: center; gap: 2px; }
.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  font-size: 13px; font-weight: 500;
  color: var(--hf-text-muted);
  border-radius: 8px;
  cursor: pointer;
}
.tab:hover { background: var(--hf-bg); color: var(--hf-text); }
.tab.active { color: var(--hf-primary); background: var(--hf-primary-soft); }
.count {
  font-family: var(--hf-mono);
  font-size: 10.5px;
  color: var(--hf-text-subtle);
}
.tab.active .count { color: var(--hf-primary); }
</style>
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/jobs/JobsTabRow.vue
git commit -m "feat(frontend): flat JobsTabRow with faceted counts"
```

---

### Task 7: Frontend — Filters / Owner / Columns menus

**Files:**
- Create: `apps/frontend/src/components/jobs/JobsFiltersMenu.vue`
- Create: `apps/frontend/src/components/jobs/JobsOwnerMenu.vue`
- Create: `apps/frontend/src/components/jobs/JobsColumnsMenu.vue`

**Interfaces:**
- Consumes: `JobFacets` (Task 4), `JOB_TYPE_LABELS`, `EMPLOYMENT_TYPE_LABELS`.
- Produces:
  - `JobsFiltersMenu` props `{ facets: JobFacets; modelValue: JobFilters }` emits `update:modelValue`, where `JobFilters = { department?: string; location?: string; jobType?: JobType; employmentType?: EmploymentType }`.
  - `JobsOwnerMenu` props `{ owners: JobOwner[]; modelValue?: string }` emits `update:modelValue` (ownerId or undefined).
  - `JobsColumnsMenu` props `{ modelValue: string[] }` (hidden column keys) emits `update:modelValue`.

- [ ] **Step 1: JobsFiltersMenu.vue**

```vue
<template>
  <v-menu :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: act }">
      <button class="hf-btn ghost" v-bind="act">
        <HfIcon name="filter" :size="14" />Filters
        <span v-if="activeCount" class="hf-tag badge">{{ activeCount }}</span>
      </button>
    </template>
    <div class="hf-select-menu filters-pop">
      <AppField type="select" label="Department" :items="deptItems" v-model="draft.department" clearable />
      <AppField type="select" label="Location" :items="locItems" v-model="draft.location" clearable />
      <AppField type="select" label="Work mode" :items="workModeItems" v-model="draft.jobType" clearable />
      <AppField type="select" label="Job type" :items="jobTypeItems" v-model="draft.employmentType" clearable />
      <div class="actions">
        <AppButton variant="ghost" @click="clearAll">Clear all</AppButton>
        <AppButton variant="primary" @click="apply">Apply</AppButton>
      </div>
    </div>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { JobFacets, JobType, EmploymentType } from '@/types/job'
import { JOB_TYPE_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/types/job'
import HfIcon from '@/components/common/HfIcon.vue'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'

export interface JobFilters {
  department?: string
  location?: string
  jobType?: JobType
  employmentType?: EmploymentType
}

const props = defineProps<{ facets: JobFacets; modelValue: JobFilters }>()
const emit = defineEmits<{ 'update:modelValue': [JobFilters] }>()

const draft = reactive<JobFilters>({ ...props.modelValue })
watch(() => props.modelValue, (v) => Object.assign(draft, v))

const deptItems = computed(() => props.facets.departments.map((d) => ({ title: d, value: d })))
const locItems = computed(() => props.facets.locations.map((l) => ({ title: l, value: l })))
const workModeItems = (Object.keys(JOB_TYPE_LABELS) as JobType[]).map((k) => ({ title: JOB_TYPE_LABELS[k], value: k }))
const jobTypeItems = (Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((k) => ({ title: EMPLOYMENT_TYPE_LABELS[k], value: k }))

const activeCount = computed(() => Object.values(props.modelValue).filter((v) => v != null && v !== '').length)

function apply() { emit('update:modelValue', { ...draft }) }
function clearAll() {
  draft.department = undefined; draft.location = undefined; draft.jobType = undefined; draft.employmentType = undefined
  emit('update:modelValue', {})
}
</script>

<style scoped>
.badge { margin-left: 4px; height: 18px; padding: 0 6px; font-size: 10.5px; }
.filters-pop { padding: 14px; width: 240px; display: flex; flex-direction: column; gap: 10px; }
.actions { display: flex; justify-content: space-between; gap: 8px; padding-top: 4px; }
</style>
```

NOTE: confirm `AppField` `type="select"` accepts `:items`, `clearable`, and `v-model`. If its API differs, adapt to a `v-select` directly with the same classes. Confirm `HfIcon` has `filter`.

- [ ] **Step 2: JobsOwnerMenu.vue**

```vue
<template>
  <v-menu location="bottom end">
    <template #activator="{ props: act }">
      <button class="hf-btn ghost" v-bind="act">
        Owner: {{ selectedLabel }}<HfIcon name="chevronDown" :size="14" />
      </button>
    </template>
    <v-list class="hf-select-menu" density="compact">
      <v-list-item @click="emit('update:modelValue', undefined)">
        <v-list-item-title>All</v-list-item-title>
      </v-list-item>
      <v-list-item v-for="o in owners" :key="o.id" @click="emit('update:modelValue', o.id)">
        <v-list-item-title>{{ o.fullName }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobOwner } from '@/types/job'
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ owners: JobOwner[]; modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string | undefined] }>()

const selectedLabel = computed(() => {
  if (!props.modelValue) return 'All'
  return props.owners.find((o) => o.id === props.modelValue)?.fullName ?? 'All'
})
</script>
```

NOTE: confirm `HfIcon` has `chevronDown` (the toolbar already uses a chevron elsewhere — reuse that name).

- [ ] **Step 3: JobsColumnsMenu.vue**

```vue
<template>
  <v-menu :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: act }">
      <button class="hf-btn ghost" v-bind="act" aria-label="Columns"><HfIcon name="layout" :size="15" /></button>
    </template>
    <div class="hf-select-menu cols-pop">
      <label v-for="c in toggleable" :key="c.key" class="row">
        <input type="checkbox" :checked="!modelValue.includes(c.key)" @change="toggle(c.key)" />
        {{ c.label }}
      </label>
    </div>
  </v-menu>
</template>

<script setup lang="ts">
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const toggleable = [
  { key: 'status', label: 'Status' },
  { key: 'applicationCount', label: 'Applicants' },
  { key: 'publishedAt', label: 'Opened' },
  { key: 'owner', label: 'Owner' },
]

function toggle(key: string) {
  const next = props.modelValue.includes(key)
    ? props.modelValue.filter((k) => k !== key)
    : [...props.modelValue, key]
  emit('update:modelValue', next)
}
</script>

<style scoped>
.cols-pop { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; min-width: 150px; }
.row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--hf-text); cursor: pointer; }
</style>
```

NOTE: confirm `HfIcon` has `layout`. If not, add it.

- [ ] **Step 4: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/jobs/JobsFiltersMenu.vue apps/frontend/src/components/jobs/JobsOwnerMenu.vue apps/frontend/src/components/jobs/JobsColumnsMenu.vue
git commit -m "feat(frontend): jobs Filters/Owner/Columns menus"
```

---

### Task 8: Frontend — JobsToolbar recomposition

**Files:**
- Modify: `apps/frontend/src/components/jobs/JobsToolbar.vue`

**Interfaces:**
- Consumes: `JobsTabRow`, `JobsFiltersMenu` (+ `JobFilters`), `JobsOwnerMenu`, `JobsColumnsMenu`.
- Produces: `JobsToolbar` props `{ search; status; counts; facets; filters: JobFilters; ownerId?: string; hiddenCols: string[] }`, emits `update:search`, `update:status`, `update:filters`, `update:ownerId`, `update:hiddenCols`, `new`.

- [ ] **Step 1: Rewrite JobsToolbar.vue**

Keep the header (h1 "Jobs" + subtitle + New job button — fix the existing bug where `@emit="'new'"` should be `@click="emit('new')"`). Replace `SegmentedTabs` with `JobsTabRow`. Build the filter row: tab row left; search + Filters + Owner + Columns right.

```vue
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
```

Delete the now-unused `SegmentedTabs` import and `statusOptions`. (Leave `SegmentedTabs.vue` in place — JobForm still uses it.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/jobs/JobsToolbar.vue
git commit -m "feat(frontend): recompose JobsToolbar — flat tabs + Filters/Owner/Columns row"
```

---

### Task 9: Frontend — JobsTable Owner column + column visibility

**Files:**
- Modify: `apps/frontend/src/components/jobs/JobsTable.vue`

**Interfaces:**
- Consumes: `JobListItem.owner`, `hiddenCols` prop.
- Produces: `JobsTable` gains prop `hiddenCols: string[]`; renders an Owner column unless hidden; filters all toggleable columns by `hiddenCols`.

- [ ] **Step 1: Add hiddenCols prop + Owner column**

Add `hiddenCols: string[]` to `defineProps`. Add an `owner` entry to the base `columns` array (after `publishedAt`):

```typescript
  { key: 'owner', title: 'Owner' },
```

Make the rendered columns reactive to `hiddenCols`:

```typescript
const visibleColumns = computed(() => columns.filter((c) => !props.hiddenCols.includes(c.key)))
```

Bind `:columns="visibleColumns"` on `AppDataTable`. Add the owner cell template:

```vue
      <template #item.owner="{ item }">
        <div class="owner-cell">
          <span class="owner-avatar" :style="avatarStyle((item as JobListItem).owner.fullName)">
            {{ ownerInitials((item as JobListItem).owner.fullName) }}
          </span>
          <span class="owner-name">{{ (item as JobListItem).owner.fullName.split(' ')[0] }}</span>
        </div>
      </template>
```

Add helper + styles:

```typescript
function ownerInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}
```

```css
.owner-cell { display: flex; align-items: center; gap: 8px; }
.owner-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  color: white; font-weight: 600; font-size: 10px;
  display: grid; place-items: center; flex-shrink: 0;
}
.owner-name { font-size: 12.5px; }
```

(Reuse existing `avatarStyle`. If `item.owner.avatarUrl` is set, render an `<img>` instead of initials — optional, initials are the safe default.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/jobs/JobsTable.vue
git commit -m "feat(frontend): JobsTable owner column + column visibility"
```

---

### Task 10: Frontend — JobsList wiring (filters, facets, pagination, persistence)

**Files:**
- Modify: `apps/frontend/src/views/JobsList.vue`

**Interfaces:**
- Consumes: store `fetchFacets`/`facets`, `AppPagination`, recomposed `JobsToolbar`, `JobFilters`.

- [ ] **Step 1: Add state + load wiring**

In `JobsList.vue` add refs: `filters = ref<JobFilters>({})`, `ownerId = ref<string | undefined>()`, and `hiddenCols = ref<string[]>(JSON.parse(localStorage.getItem('hf.jobs.hiddenCols') ?? '[]'))`. Persist on change:

```typescript
watch(hiddenCols, (v) => localStorage.setItem('hf.jobs.hiddenCols', JSON.stringify(v)), { deep: true })
```

Extend `load()` to pass `...filters.value` and `ownerId: ownerId.value` into `store.fetchJobs`. Capture `response.value.counts`. On mount call `store.fetchFacets()` alongside `load()`.

Add handlers that reset to page 1 and reload:

```typescript
function onFilters(v: JobFilters) { filters.value = v; page.value = 1; load() }
function onOwner(v: string | undefined) { ownerId.value = v; page.value = 1; load() }
function onPage(p: number) { page.value = p; load() }
function onPageSize(s: number) { pageSize.value = s; page.value = 1; load() }
```

- [ ] **Step 2: Update template**

Pass the new props/handlers to `JobsToolbar`; pass `hiddenCols` to `JobsTable`; render `AppPagination` below the table inside the same `hf-card` (so it reads as the table footer):

```vue
    <div class="hf-card table-wrap">
      <JobsTable
        :jobs="response.data"
        :loading="store.loading"
        :total="response.total"
        :page="page"
        :page-size="pageSize"
        :sort-by="sortBy"
        :sort-order="sortOrder"
        :hidden-cols="hiddenCols"
        @update:options="onOptions"
        @row-click="(j) => router.push(`/jobs/${j.id}/edit`)"
        @action="onAction"
      />
      <AppPagination
        :total="response.total"
        :page="page"
        :page-size="pageSize"
        @update:page="onPage"
        @update:page-size="onPageSize"
      />
    </div>
```

For the toolbar:

```vue
    <JobsToolbar
      :search="search" :status="statusFilter" :counts="response.counts"
      :facets="store.facets" :filters="filters" :owner-id="ownerId" :hidden-cols="hiddenCols"
      @update:search="onSearch" @update:status="onStatus"
      @update:filters="onFilters" @update:owner-id="onOwner" @update:hidden-cols="hiddenCols = $event"
      @new="router.push('/jobs/new')"
    />
```

Initialize `response` default with `counts: { all: 0, DRAFT: 0, PUBLISHED: 0, CLOSED: 0 }`. `JobsTable` no longer wraps itself in `hf-card table-card` — move that wrapper to `JobsList` (the `table-wrap` div) so pagination shares the card; remove the outer `hf-card` from `JobsTable.vue` template (it becomes just the `AppDataTable`). Add `.table-wrap { padding: 0; overflow: hidden; }` style.

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/views/JobsList.vue apps/frontend/src/components/jobs/JobsTable.vue
git commit -m "feat(frontend): wire jobs filters, facets, owner, custom pagination + column persistence"
```

---

### Task 11: Full verification + CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md` (update the Jobs List bullet)

- [ ] **Step 1: Backend test + typecheck**

Run: `cd apps/backend && npm test && npx tsc --noEmit`
Expected: all green.

- [ ] **Step 2: Frontend typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Update CLAUDE.md**

Append to the Jobs List bullet: flat tab row with faceted counts; functional Filters (dept/location/work-mode/job-type) + Owner dropdown + Columns toggle (localStorage); Owner column; new `GET /jobs/facets`; reusable `AppPagination` replacing Vuetify footer. Note manual e2e still pending.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md — jobs list filters + pagination"
```

## Notes for the implementer
- The frontend `api` axios instance and store patterns already exist — mirror `fetchJobs` for `fetchFacets`.
- Several steps say "confirm HfIcon has X" — open `HfIcon.vue` and check the icon map; add missing Lucide paths (`chevronLeft`, `chevronRight`, `chevronDown`, `filter`, `layout`) following the existing entries before using them.
- Do NOT touch `SegmentedTabs.vue` — JobForm depends on it.
- Manual e2e (logged-in recruiter) is the user's responsibility per project convention.
