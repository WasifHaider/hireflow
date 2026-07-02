# Candidates List + Candidate Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two recruiter-facing, read-only, backend-driven screens — a global Candidates List (filter sidebar + table + pagination) and a full-screen Candidate Detail reached by clicking a row.

**Architecture:** Extend the existing `applications` Nest module with two new read endpoints (`GET /applications/facets`, `GET /applications/:id`) and three new filter params on the existing `GET /applications`. Frontend adds a Pinia store, two route views inside the existing `RecruiterLayout`, and small presentational components, all built on the existing shared Vuetify wrappers (`AppDataTable`, `AppPagination`, `AppButton`, `AppCheckbox`, `HfIcon`).

**Tech Stack:** NestJS + Prisma (backend, Jest unit tests with mocked Prisma); Vue 3 + Vuetify 3 + Pinia + TypeScript (frontend, verified via `vue-tsc`).

## Global Constraints

- **DO NOT `git commit` or `git merge`.** The user handles all git. Every task below ends with a verification step instead of a commit. When a task passes, stop and let the user review.
- Read-only: NO write/mutation/bulk actions anywhere (no stage change, message, tag, reject, export, import, add candidate, Ask AI).
- Tenant isolation: every backend query filters by `companyId` derived from the JWT (`user.companyId`), never from the request. Tenant-scoped single lookups use `findFirst({ where: { id, companyId } })`. Cross-tenant → 404 (enumeration defense).
- Sensitive fields never selected (no `passwordHash`, no `coverLetter`, no `aiScoreDetails` in the list). `resumeText` IS exposed on the detail endpoint only (recruiter needs it).
- Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) on every endpoint; proper TS types (no unjustified `any`).
- Frontend: Vuetify-first, reuse shared wrappers — no hand-rolled `<button>`/`<input>`. Every fetch shows a loading state (skeleton).
- Facet counts in this version are **company-scoped totals** (not reactive to the other active filters). This is a deliberate simplification of the spec's baseWhere pattern — acceptable for a read-only browse screen; noted so a reviewer doesn't flag it as a bug.
- Frontend has no component unit-test harness (consistent with prior screens); frontend tasks verify via `npx vue-tsc --noEmit -p tsconfig.app.json`. Backend tasks use Jest TDD.

---

## File Structure

**Backend (`apps/backend/`):**
- Modify `src/applications/dto/list-applications-query.dto.ts` — add `q`, `scoreMin`, `scoreMax`.
- Modify `src/applications/applications.service.ts` — extend `findAll` where-clause + select; add `getFacets`, `findOne`.
- Modify `src/applications/applications.controller.ts` — add `GET /facets` and `GET /:id` routes.
- Create `src/applications/dto/application-facets.dto.ts` — facets response DTO.
- Create `src/applications/dto/application-detail.dto.ts` — detail response DTO.
- Modify `src/applications/applications.service.spec.ts` — add tests for new filters, facets, detail.

**Frontend (`apps/frontend/`):**
- Create `src/types/candidate.ts` — domain types + stage labels.
- Create `src/stores/candidates.store.ts` — fetch actions.
- Modify `src/components/common/AppPagination.vue` — add `noun` prop (generic noun in "Showing N–M of T <noun>").
- Modify `src/views/JobsList.vue` — pass `noun="jobs"` to AppPagination (keeps existing wording).
- Modify `src/components/common/HfIcon.vue` — add `phone` and `link` icons.
- Modify `src/assets/hireflow.css` — port `hf-ring`, `hf-resume`, `hf-timeline` rules.
- Create `src/components/candidates/CandidatesFilterSidebar.vue` — Stage/Job/AI-fit checkbox groups.
- Create `src/components/candidates/CandidatesTable.vue` — wraps AppDataTable.
- Create `src/views/CandidatesList.vue` — list container.
- Create `src/components/candidates/CandidateFitRing.vue` — AI-fit ring.
- Create `src/components/candidates/CandidateResumePanel.vue` — resume text + download.
- Create `src/components/candidates/CandidateTimeline.vue` — minimal 2-item timeline.
- Create `src/views/CandidateDetail.vue` — detail container.
- Modify `src/router/index.ts` — add `/candidates` and `/candidates/:id` child routes.

---

## Task 1: Backend — new list filters (q, scoreMin, scoreMax)

**Files:**
- Modify: `apps/backend/src/applications/dto/list-applications-query.dto.ts`
- Modify: `apps/backend/src/applications/applications.service.ts:45-71`
- Test: `apps/backend/src/applications/applications.service.spec.ts`

**Interfaces:**
- Produces: `ListApplicationsQueryDto` gains `q?: string`, `scoreMin?: number`, `scoreMax?: number`. `findAll(query, companyId)` return shape is unchanged (`{ data, total, page, pageSize, totalPages }`).

- [ ] **Step 1: Write failing tests**

Add to `applications.service.spec.ts` inside the existing `describe('ApplicationsService.findAll')` block:

```ts
it('filters by candidate name/email when q is present', async () => {
  prisma.application.findMany.mockResolvedValue([]);
  prisma.application.count.mockResolvedValue(0);
  const query = Object.assign(new ListApplicationsQueryDto(), {
    page: 1, pageSize: 20, sortBy: 'appliedAt', sortOrder: 'desc', q: 'sarah',
  });
  await service.findAll(query, 'company-1');
  expect(prisma.application.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        companyId: 'company-1',
        candidate: {
          OR: [
            { fullName: { contains: 'sarah', mode: 'insensitive' } },
            { email: { contains: 'sarah', mode: 'insensitive' } },
          ],
        },
      },
    }),
  );
});

it('filters by aiFitScore range when scoreMin/scoreMax present', async () => {
  prisma.application.findMany.mockResolvedValue([]);
  prisma.application.count.mockResolvedValue(0);
  const query = Object.assign(new ListApplicationsQueryDto(), {
    page: 1, pageSize: 20, sortBy: 'appliedAt', sortOrder: 'desc', scoreMin: 80, scoreMax: 89,
  });
  await service.findAll(query, 'company-1');
  expect(prisma.application.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { companyId: 'company-1', aiFitScore: { gte: 80, lte: 89 } },
    }),
  );
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd apps/backend && npx jest applications.service --silent`
Expected: FAIL — the two new tests fail (where clause lacks `candidate`/`aiFitScore`).

- [ ] **Step 3: Add the DTO fields**

In `list-applications-query.dto.ts`, add `IsString` to the `class-validator` import, then add these properties to the class:

```ts
  @ApiPropertyOptional({ description: 'Search candidate name or email' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(0)
  @Max(100)
  scoreMin?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(0)
  @Max(100)
  scoreMax?: number;
```

- [ ] **Step 4: Extend the `findAll` where-clause**

In `applications.service.ts`, replace the where-building block (currently lines 46-48) with:

```ts
    const where: Prisma.ApplicationWhereInput = { companyId };
    if (query.jobId) where.jobId = query.jobId;
    if (query.stage) where.currentStage = query.stage;
    if (query.q) {
      where.candidate = {
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      };
    }
    if (query.scoreMin != null || query.scoreMax != null) {
      const range: Prisma.IntFilter = {};
      if (query.scoreMin != null) range.gte = query.scoreMin;
      if (query.scoreMax != null) range.lte = query.scoreMax;
      where.aiFitScore = range;
    }
```

Also add `id: true` to the candidate select (line ~60) so rows can be linked later:

```ts
          candidate: { select: { id: true, fullName: true, email: true } },
```

- [ ] **Step 5: Run tests, verify all pass**

Run: `cd apps/backend && npx jest applications.service --silent`
Expected: PASS — all findAll tests (including the original 2) green.

- [ ] **Step 6: Verify (no commit)**

Run: `cd apps/backend && npx tsc --noEmit -p tsconfig.json`
Expected: exit 0. Stop here for user review.

---

## Task 2: Backend — facets endpoint

**Files:**
- Create: `apps/backend/src/applications/dto/application-facets.dto.ts`
- Modify: `apps/backend/src/applications/applications.service.ts` (add `getFacets`)
- Modify: `apps/backend/src/applications/applications.controller.ts` (add `GET /facets`)
- Test: `apps/backend/src/applications/applications.service.spec.ts`

**Interfaces:**
- Produces: `ApplicationsService.getFacets(companyId: string): Promise<{ stages: Record<ApplicationStage, number>; jobs: { id: string; title: string; count: number }[]; aiFitRanges: { '90-100': number; '80-89': number; '70-79': number; 'below-70': number; unscored: number } }>`. Route: `GET /applications/facets`.

- [ ] **Step 1: Write the facets DTO**

Create `application-facets.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

class FacetJobDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() count!: number;
}

class FacetRangesDto {
  @ApiProperty({ name: '90-100' }) '90-100'!: number;
  @ApiProperty({ name: '80-89' }) '80-89'!: number;
  @ApiProperty({ name: '70-79' }) '70-79'!: number;
  @ApiProperty({ name: 'below-70' }) 'below-70'!: number;
  @ApiProperty() unscored!: number;
}

export class ApplicationFacetsDto {
  @ApiProperty({ description: 'Count per stage', example: { APPLIED: 142, SCREENED: 68 } })
  stages!: Record<string, number>;

  @ApiProperty({ type: [FacetJobDto] })
  jobs!: FacetJobDto[];

  @ApiProperty({ type: FacetRangesDto })
  aiFitRanges!: FacetRangesDto;
}
```

- [ ] **Step 2: Write the failing test**

Add a new `describe` block to `applications.service.spec.ts`:

```ts
describe('ApplicationsService.getFacets', () => {
  let service: ApplicationsService;
  let prisma: {
    application: { groupBy: jest.Mock; count: jest.Mock };
    job: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      application: { groupBy: jest.fn(), count: jest.fn() },
      job: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it('zero-fills stages and maps job titles', async () => {
    prisma.application.groupBy
      .mockResolvedValueOnce([{ currentStage: 'APPLIED', _count: { _all: 3 } }]) // stages
      .mockResolvedValueOnce([{ jobId: 'j1', _count: { _all: 3 } }]);           // jobs
    prisma.job.findMany.mockResolvedValue([{ id: 'j1', title: 'Backend' }]);
    prisma.application.count.mockResolvedValue(0);

    const result = await service.getFacets('company-1');

    expect(result.stages).toEqual({
      APPLIED: 3, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0,
    });
    expect(result.jobs).toEqual([{ id: 'j1', title: 'Backend', count: 3 }]);
    expect(result.aiFitRanges.unscored).toBe(0);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `cd apps/backend && npx jest applications.service --silent`
Expected: FAIL — `service.getFacets is not a function`.

- [ ] **Step 4: Implement `getFacets`**

Add to `applications.service.ts` (import `ApplicationStage` from `@prisma/client` at top):

```ts
  async getFacets(companyId: string): Promise<ApplicationFacetsDto> {
    const where: Prisma.ApplicationWhereInput = { companyId };
    const [stageGrouped, jobGrouped, jobs, r90, r80, r70, rbelow, unscored] =
      await Promise.all([
        this.prisma.application.groupBy({ by: ['currentStage'], where, _count: { _all: true } }),
        this.prisma.application.groupBy({ by: ['jobId'], where, _count: { _all: true } }),
        this.prisma.job.findMany({ where: { companyId }, select: { id: true, title: true } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 90 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 80, lte: 89 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 70, lte: 79 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 0, lte: 69 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: null } }),
      ]);

    const stages: Record<string, number> = {
      APPLIED: 0, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0,
    };
    for (const g of stageGrouped) {
      stages[g.currentStage] = g._count._all;
    }

    const titleById = new Map(jobs.map((j) => [j.id, j.title]));
    const jobsFacet = jobGrouped
      .filter((g) => titleById.has(g.jobId))
      .map((g) => ({ id: g.jobId, title: titleById.get(g.jobId) as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    return {
      stages,
      jobs: jobsFacet,
      aiFitRanges: {
        '90-100': r90, '80-89': r80, '70-79': r70, 'below-70': rbelow, unscored,
      },
    };
  }
```

Add the import at the top of the service file:

```ts
import { ApplicationFacetsDto } from './dto/application-facets.dto';
```

- [ ] **Step 5: Add the controller route (BEFORE any `:id` route)**

In `applications.controller.ts`, import the DTO and add this method immediately after `findAll` (so `facets` is matched before the `:id` routes added in Task 3):

```ts
  @Get('facets')
  @ApiOperation({ summary: 'Filter facet counts for the candidates list' })
  @ApiResponse({ status: 200, type: ApplicationFacetsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFacets(@CurrentUser() user: SafeUser): Promise<ApplicationFacetsDto> {
    return this.applicationsService.getFacets(user.companyId);
  }
```

Import: `import { ApplicationFacetsDto } from './dto/application-facets.dto';`

- [ ] **Step 6: Run test + typecheck**

Run: `cd apps/backend && npx jest applications.service --silent && npx tsc --noEmit -p tsconfig.json`
Expected: PASS + exit 0. Stop for user review.

---

## Task 3: Backend — candidate detail endpoint

**Files:**
- Create: `apps/backend/src/applications/dto/application-detail.dto.ts`
- Modify: `apps/backend/src/applications/applications.service.ts` (add `findOne`)
- Modify: `apps/backend/src/applications/applications.controller.ts` (add `GET /:id`)
- Test: `apps/backend/src/applications/applications.service.spec.ts`

**Interfaces:**
- Produces: `ApplicationsService.findOne(id: string, companyId: string)` returns the detail object (selected fields below) or throws `NotFoundException`. Route: `GET /applications/:id`.

- [ ] **Step 1: Write the detail DTO**

Create `application-detail.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';

class DetailCandidateDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) linkedinUrl!: string | null;
}

class DetailJobDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
}

export class ApplicationDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ApplicationStage }) currentStage!: ApplicationStage;
  @ApiProperty({ nullable: true }) aiFitScore!: number | null;
  @ApiProperty({ nullable: true, type: Object }) aiScoreDetails!: unknown;
  @ApiProperty() appliedAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true }) resumeText!: string | null;
  @ApiProperty({ nullable: true }) resumeFilename!: string | null;
  @ApiProperty({ type: DetailCandidateDto }) candidate!: DetailCandidateDto;
  @ApiProperty({ type: DetailJobDto }) job!: DetailJobDto;
}
```

- [ ] **Step 2: Write failing tests**

Add a new `describe` block to `applications.service.spec.ts`:

```ts
describe('ApplicationsService.findOne', () => {
  let service: ApplicationsService;
  let prisma: { application: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = { application: { findFirst: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it('returns the application scoped to companyId', async () => {
    const app = { id: 'a1', candidate: { id: 'c1' }, job: { id: 'j1' } };
    prisma.application.findFirst.mockResolvedValue(app);
    const result = await service.findOne('a1', 'company-1');
    expect(prisma.application.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1', companyId: 'company-1' } }),
    );
    expect(result).toBe(app);
  });

  it('throws NotFound when missing or cross-tenant', async () => {
    prisma.application.findFirst.mockResolvedValue(null);
    await expect(service.findOne('a1', 'company-1')).rejects.toThrow('Candidate not found');
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `cd apps/backend && npx jest applications.service --silent`
Expected: FAIL — `service.findOne is not a function`.

- [ ] **Step 4: Implement `findOne`**

Add to `applications.service.ts`:

```ts
  async findOne(id: string, companyId: string): Promise<ApplicationDetailDto> {
    const application = await this.prisma.application.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        currentStage: true,
        aiFitScore: true,
        aiScoreDetails: true,
        appliedAt: true,
        updatedAt: true,
        resumeText: true,
        resumeFilename: true,
        candidate: { select: { id: true, fullName: true, email: true, phone: true, linkedinUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Candidate not found');
    }

    return application as ApplicationDetailDto;
  }
```

Add import: `import { ApplicationDetailDto } from './dto/application-detail.dto';`

- [ ] **Step 5: Add the controller route (AFTER `facets`, can sit before/after `:id/resume-url`)**

In `applications.controller.ts`, add (import `ApplicationDetailDto`):

```ts
  @Get(':id')
  @ApiOperation({ summary: 'Get a single candidate application detail' })
  @ApiResponse({ status: 200, type: ApplicationDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.findOne(id, user.companyId);
  }
```

Verify route order in the controller is: `@Get()`, `@Get('facets')`, `@Get(':id/resume-url')`, `@Get(':id')`. (`facets` must precede `:id`.)

- [ ] **Step 6: Run full backend tests + typecheck**

Run: `cd apps/backend && npx jest --silent && npx tsc --noEmit -p tsconfig.json`
Expected: all green, exit 0. Stop for user review.

---

## Task 4: Frontend — types + store

**Files:**
- Create: `apps/frontend/src/types/candidate.ts`
- Create: `apps/frontend/src/stores/candidates.store.ts`

**Interfaces:**
- Produces: types `CandidateListItem`, `CandidateListResponse`, `CandidateFacets`, `CandidateDetail`, `CandidateListQuery`, `ApplicationStage`, `STAGE_LABELS`, `AI_FIT_RANGES`. Store `useCandidatesStore()` with `loading`, `error`, `facets`, and actions `fetchCandidates(query)`, `fetchFacets()`, `fetchCandidate(id)`, `fetchResumeUrl(id)`.

- [ ] **Step 1: Write the types file**

Create `src/types/candidate.ts`:

```ts
// Candidate (application) domain types — mirror the backend applications endpoints.

export type ApplicationStage =
  | 'APPLIED' | 'SCREENED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED'

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  SCREENED: 'Screened',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
}

export const STAGE_ORDER: ApplicationStage[] = [
  'APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED',
]

// AI-fit range buckets — value matches the backend facet keys + filter params.
export const AI_FIT_RANGES: { key: string; label: string; min?: number; max?: number }[] = [
  { key: '90-100', label: '90 – 100', min: 90, max: 100 },
  { key: '80-89', label: '80 – 89', min: 80, max: 89 },
  { key: '70-79', label: '70 – 79', min: 70, max: 79 },
  { key: 'below-70', label: 'Below 70', min: 0, max: 69 },
]

export interface CandidateListItem {
  id: string
  candidate: { id: string; fullName: string; email: string }
  job: { id: string; title: string }
  currentStage: ApplicationStage
  aiFitScore: number | null
  appliedAt: string
}

export interface CandidateListResponse {
  data: CandidateListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CandidateFacets {
  stages: Record<ApplicationStage, number>
  jobs: { id: string; title: string; count: number }[]
  aiFitRanges: Record<string, number>
}

export interface CandidateDetail {
  id: string
  currentStage: ApplicationStage
  aiFitScore: number | null
  aiScoreDetails: { model?: string; rawScore?: number; reason?: string } | null
  appliedAt: string
  updatedAt: string
  resumeText: string | null
  resumeFilename: string | null
  candidate: {
    id: string
    fullName: string
    email: string
    phone: string | null
    linkedinUrl: string | null
  }
  job: { id: string; title: string }
}

export interface CandidateListQuery {
  page?: number
  pageSize?: number
  q?: string
  stage?: ApplicationStage
  jobId?: string
  scoreMin?: number
  scoreMax?: number
  sortBy?: 'appliedAt' | 'aiFitScore'
  sortOrder?: 'asc' | 'desc'
}

export const EMPTY_FACETS: CandidateFacets = {
  stages: { APPLIED: 0, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0 },
  jobs: [],
  aiFitRanges: {},
}
```

- [ ] **Step 2: Write the store**

Create `src/stores/candidates.store.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type {
  CandidateDetail,
  CandidateFacets,
  CandidateListQuery,
  CandidateListResponse,
} from '@/types/candidate'
import { EMPTY_FACETS } from '@/types/candidate'

export const useCandidatesStore = defineStore('candidates', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const facets = ref<CandidateFacets>(EMPTY_FACETS)

  async function fetchCandidates(query: CandidateListQuery = {}): Promise<CandidateListResponse> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string | number> = {}
      if (query.page) params.page = query.page
      if (query.pageSize) params.pageSize = query.pageSize
      if (query.q) params.q = query.q
      if (query.stage) params.stage = query.stage
      if (query.jobId) params.jobId = query.jobId
      if (query.scoreMin != null) params.scoreMin = query.scoreMin
      if (query.scoreMax != null) params.scoreMax = query.scoreMax
      if (query.sortBy) params.sortBy = query.sortBy
      if (query.sortOrder) params.sortOrder = query.sortOrder
      const { data } = await api.get<CandidateListResponse>('/applications', { params })
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load candidates.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchFacets(): Promise<void> {
    const { data } = await api.get<CandidateFacets>('/applications/facets')
    facets.value = data
  }

  async function fetchCandidate(id: string): Promise<CandidateDetail> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<CandidateDetail>(`/applications/${id}`)
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load candidate.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchResumeUrl(id: string): Promise<string> {
    const { data } = await api.get<{ signedUrl: string }>(`/applications/${id}/resume-url`)
    return data.signedUrl
  }

  return { loading, error, facets, fetchCandidates, fetchFacets, fetchCandidate, fetchResumeUrl }
})
```

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. Stop for user review.

---

## Task 5: Frontend — shared bits (AppPagination noun, HfIcon, CSS)

**Files:**
- Modify: `apps/frontend/src/components/common/AppPagination.vue`
- Modify: `apps/frontend/src/views/JobsList.vue` (pass `noun="jobs"`)
- Modify: `apps/frontend/src/components/common/HfIcon.vue` (add `phone`, `link`)
- Modify: `apps/frontend/src/assets/hireflow.css` (port ring/resume/timeline)

**Interfaces:**
- Produces: `AppPagination` accepts optional `noun?: string` (default `'results'`), rendered as "Showing N–M of T {noun}". `HfIcon` supports names `phone` and `link`.

- [ ] **Step 1: Add `noun` prop to AppPagination**

In `AppPagination.vue`, change the props line to:

```ts
const props = defineProps<{ total: number; page: number; pageSize: number; pageSizeOptions?: number[]; noun?: string }>()
```

And change the template's left span to:

```html
    <span class="left">
      Showing <strong>{{ rangeStart }}–{{ rangeEnd }}</strong> of <strong>{{ total }}</strong> {{ noun ?? 'results' }}
    </span>
```

- [ ] **Step 2: Keep JobsList wording**

In `JobsList.vue`, change the `<AppPagination` usage to add `noun="jobs"`:

```html
      <AppPagination
        :total="response.total"
        :page="page"
        :page-size="pageSize"
        noun="jobs"
        @update:page="onPage"
        @update:page-size="onPageSize"
      />
```

- [ ] **Step 3: Add `phone` and `link` icons to HfIcon**

Open `HfIcon.vue`, find the icon path map (object keyed by name). Add these two entries (Lucide-style 24x24 stroke paths, matching the existing `<path>`-string convention used by the other icons in that file):

```
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
```

> Note: match the EXACT structure HfIcon uses for its other entries — if it stores full `<svg>` markup or an array of path `d` strings rather than a single `d` string, adapt these two entries to that same shape. Read the file's existing `briefcase`/`mail` entries first and mirror them.

- [ ] **Step 4: Port the ring/resume/timeline CSS**

Append to `src/assets/hireflow.css`:

```css
/* Candidate detail — donut ring (CSS conic) */
.hf-ring {
  width: 132px; height: 132px;
  border-radius: 50%;
  display: grid; place-items: center;
  position: relative;
  background: conic-gradient(var(--ring-color, var(--hf-accent)) calc(var(--pct, 0) * 1%), #E5E7EB 0);
}
.hf-ring::before {
  content: '';
  position: absolute;
  inset: 11px;
  background: var(--hf-surface);
  border-radius: 50%;
}
.hf-ring-inner { position: relative; text-align: center; }
.hf-ring-num {
  font-size: 30px; font-weight: 600; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.hf-ring-lbl {
  font-size: 10.5px; color: var(--hf-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
  font-weight: 600; margin-top: -2px;
}

/* Candidate detail — resume preview */
.hf-resume {
  border: 1px solid var(--hf-border);
  border-radius: 10px;
  background:
    repeating-linear-gradient(135deg, transparent 0 9px, rgba(17,24,39,0.025) 9px 10px),
    var(--hf-surface);
  padding: 16px;
  font: 11.5px var(--hf-mono);
  color: var(--hf-text-muted);
  white-space: pre-wrap;
  max-height: 360px;
  overflow: auto;
}

/* Candidate detail — timeline */
.hf-timeline { display: flex; flex-direction: column; gap: 0; position: relative; }
.hf-timeline::before {
  content: '';
  position: absolute;
  left: 9px; top: 6px; bottom: 6px;
  width: 1.5px;
  background: var(--hf-border);
}
.hf-tl-item {
  display: grid; grid-template-columns: 20px 1fr; gap: 12px;
  padding: 8px 0; position: relative;
}
.hf-tl-dot {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--hf-surface); border: 2px solid var(--hf-border);
  display: grid; place-items: center; z-index: 1; margin-top: 2px;
}
.hf-tl-dot.done { background: var(--hf-primary); border-color: var(--hf-primary); color: white; }
.hf-tl-dot.current { background: var(--hf-surface); border-color: var(--hf-primary); }
.hf-tl-dot.current::after {
  content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--hf-primary);
}
.hf-tl-title { font-size: 13px; font-weight: 500; }
.hf-tl-sub { font-size: 11.5px; color: var(--hf-text-subtle); margin-top: 1px; }
```

- [ ] **Step 5: Verify typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. Stop for user review.

---

## Task 6: Frontend — CandidatesFilterSidebar

**Files:**
- Create: `apps/frontend/src/components/candidates/CandidatesFilterSidebar.vue`

**Interfaces:**
- Consumes: `CandidateFacets` (from store), `STAGE_ORDER`, `STAGE_LABELS`, `AI_FIT_RANGES` (from `@/types/candidate`).
- Produces: emits `update:stages` (`ApplicationStage[]`), `update:jobId` (`string | undefined`), `update:scoreRange` (`{ min?: number; max?: number } | undefined`). Props: `facets: CandidateFacets`, `selectedStages: ApplicationStage[]`, `selectedJobId?: string`, `selectedRangeKey?: string`.

- [ ] **Step 1: Build the component**

Create `CandidatesFilterSidebar.vue`:

```vue
<template>
  <aside class="hf-card filter-sidebar">
    <!-- Stage -->
    <div class="filter-group">
      <div class="filter-title">Stage</div>
      <label v-for="s in STAGE_ORDER" :key="s" class="filter-row">
        <v-checkbox
          :model-value="selectedStages.includes(s)"
          density="compact"
          hide-details
          color="primary"
          @update:model-value="toggleStage(s)"
        />
        <span class="filter-label">{{ STAGE_LABELS[s] }}</span>
        <span class="filter-count">{{ facets.stages[s] ?? 0 }}</span>
      </label>
    </div>

    <!-- Job (single-select via radio-like checkboxes) -->
    <div class="filter-group">
      <div class="filter-title">Job</div>
      <label v-for="j in facets.jobs" :key="j.id" class="filter-row">
        <v-checkbox
          :model-value="selectedJobId === j.id"
          density="compact"
          hide-details
          color="primary"
          @update:model-value="toggleJob(j.id)"
        />
        <span class="filter-label">{{ j.title }}</span>
        <span class="filter-count">{{ j.count }}</span>
      </label>
      <div v-if="!facets.jobs.length" class="filter-empty">No jobs yet</div>
    </div>

    <!-- AI fit -->
    <div class="filter-group last">
      <div class="filter-title">AI fit</div>
      <label v-for="r in AI_FIT_RANGES" :key="r.key" class="filter-row">
        <v-checkbox
          :model-value="selectedRangeKey === r.key"
          density="compact"
          hide-details
          color="primary"
          @update:model-value="toggleRange(r)"
        />
        <span class="filter-label">{{ r.label }}</span>
        <span class="filter-count">{{ facets.aiFitRanges[r.key] ?? 0 }}</span>
      </label>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ApplicationStage, CandidateFacets } from '@/types/candidate'
import { STAGE_ORDER, STAGE_LABELS, AI_FIT_RANGES } from '@/types/candidate'

const props = defineProps<{
  facets: CandidateFacets
  selectedStages: ApplicationStage[]
  selectedJobId?: string
  selectedRangeKey?: string
}>()

const emit = defineEmits<{
  'update:stages': [ApplicationStage[]]
  'update:jobId': [string | undefined]
  'update:scoreRange': [{ key?: string; min?: number; max?: number }]
}>()

function toggleStage(s: ApplicationStage) {
  const next = props.selectedStages.includes(s)
    ? props.selectedStages.filter((x) => x !== s)
    : [...props.selectedStages, s]
  emit('update:stages', next)
}

function toggleJob(id: string) {
  emit('update:jobId', props.selectedJobId === id ? undefined : id)
}

function toggleRange(r: { key: string; min?: number; max?: number }) {
  if (props.selectedRangeKey === r.key) {
    emit('update:scoreRange', {})
  } else {
    emit('update:scoreRange', { key: r.key, min: r.min, max: r.max })
  }
}
</script>

<style scoped>
.filter-sidebar { padding: 18px; position: sticky; top: 20px; }
.filter-group { padding-bottom: 18px; border-bottom: 1px solid var(--hf-border); margin-bottom: 16px; }
.filter-group.last { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
.filter-title {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--hf-text-subtle); margin-bottom: 4px;
}
.filter-row { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.filter-row :deep(.v-selection-control) { min-height: 28px; flex: 0 0 auto; }
.filter-label { flex: 1; font-size: 12.5px; color: var(--hf-text); }
.filter-count { font-size: 11px; color: var(--hf-text-subtle); font-family: var(--hf-mono); }
.filter-empty { font-size: 12px; color: var(--hf-text-subtle); padding: 4px 0; }
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. Stop for user review.

---

## Task 7: Frontend — CandidatesTable

**Files:**
- Create: `apps/frontend/src/components/candidates/CandidatesTable.vue`

**Interfaces:**
- Consumes: `AppDataTable` (`columns`, `rows`, server props), `CandidateListItem`, `STAGE_LABELS`.
- Produces: emits `row-click` (`CandidateListItem`) and `update:options` (`{ page; pageSize; sortBy; sortOrder }`). Props: `candidates`, `loading`, `total`, `page`, `pageSize`, `sortBy`, `sortOrder`.

- [ ] **Step 1: Build the component**

Create `CandidatesTable.vue`. The table reuses `AppDataTable`'s built-in cell types (`avatar`, `twoLine`, `score`, `stage`, `muted`); a `#item.aiFitScore` slot handles the null ("—") case.

```vue
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

const props = defineProps<{
  candidates: CandidateListItem[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  sortBy: 'appliedAt' | 'aiFitScore'
  sortOrder: 'asc' | 'desc'
}>()

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

const columns: Column[] = [
  { key: 'candidateName', title: 'Candidate', type: 'avatar', subField: 'candidateEmail' },
  { key: 'jobTitle', title: 'Applying for', type: 'twoLine', subField: 'appliedLabel' },
  { key: 'aiFitScore', title: 'AI fit', sortable: true },
  { key: 'currentStage', title: 'Stage' },
]

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

function scoreLevel(v: number): string {
  return v >= 80 ? 'high' : v >= 60 ? 'mid' : 'low'
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
```

> Note: only `aiFitScore` is sortable (backend supports `appliedAt`/`aiFitScore`). AppDataTable emits `update:options` once on mount; the container's no-op guard (Task 8) absorbs that echo.

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. Stop for user review.

---

## Task 8: Frontend — CandidatesList view + route

**Files:**
- Create: `apps/frontend/src/views/CandidatesList.vue`
- Modify: `apps/frontend/src/router/index.ts`

**Interfaces:**
- Consumes: `useCandidatesStore`, `CandidatesFilterSidebar`, `CandidatesTable`, `AppPagination`, `AppField` (search), types.
- Produces: route `/candidates` (name `candidates`).

- [ ] **Step 1: Build the view**

Create `CandidatesList.vue`:

```vue
<template>
  <div class="candidates-page">
    <!-- Header -->
    <div class="page-head">
      <div>
        <div class="hf-muted crumb">{{ workspace }} · all jobs</div>
        <h1 class="hf-h1">Candidates</h1>
      </div>
      <span class="match-count"><strong>{{ response.total }}</strong> candidates</span>
    </div>

    <!-- Search + sort -->
    <div class="toolbar">
      <AppField
        class="search"
        :model-value="search"
        placeholder="Search by name or email…"
        hide-details
        @update:model-value="onSearch"
      >
        <template #prepend-inner><HfIcon name="search" :size="14" /></template>
      </AppField>
      <div class="sort">
        <span class="hf-muted">Sort:</span>
        <v-select
          :model-value="sortKey"
          :items="sortOptions"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="onSort"
        />
      </div>
    </div>

    <!-- Body: sidebar + table -->
    <div class="body-grid">
      <CandidatesFilterSidebar
        :facets="store.facets"
        :selected-stages="stages"
        :selected-job-id="jobId"
        :selected-range-key="rangeKey"
        @update:stages="onStages"
        @update:job-id="onJob"
        @update:score-range="onRange"
      />

      <div class="hf-card table-wrap">
        <CandidatesTable
          :candidates="response.data"
          :loading="store.loading"
          :total="response.total"
          :page="page"
          :page-size="pageSize"
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @row-click="(c) => router.push(`/candidates/${c.id}`)"
          @update:options="onOptions"
        />
        <AppPagination
          :total="response.total"
          :page="page"
          :page-size="pageSize"
          noun="candidates"
          @update:page="onPage"
          @update:page-size="onPageSize"
        />
      </div>
    </div>

    <v-snackbar v-model="snack.open" :timeout="2600" location="bottom right">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCandidatesStore } from '@/stores/candidates.store'
import { useAuthStore } from '@/stores/auth.store'
import type { ApplicationStage, CandidateListResponse } from '@/types/candidate'
import { STAGE_ORDER } from '@/types/candidate'
import CandidatesFilterSidebar from '@/components/candidates/CandidatesFilterSidebar.vue'
import CandidatesTable from '@/components/candidates/CandidatesTable.vue'
import AppField from '@/components/common/AppField.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import HfIcon from '@/components/common/HfIcon.vue'
import { computed } from 'vue'

const router = useRouter()
const store = useCandidatesStore()
const auth = useAuthStore()

const workspace = computed(() => auth.user?.company?.name ?? 'Workspace')

const page = ref(1)
const pageSize = ref(10)
const search = ref('')
const sortBy = ref<'appliedAt' | 'aiFitScore'>('aiFitScore')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Default: all non-terminal stages selected (matches mockup default).
const stages = ref<ApplicationStage[]>([...STAGE_ORDER])
const jobId = ref<string | undefined>(undefined)
const rangeKey = ref<string | undefined>(undefined)
const scoreMin = ref<number | undefined>(undefined)
const scoreMax = ref<number | undefined>(undefined)

const sortKey = ref('ai-desc')
const sortOptions = [
  { title: 'AI fit (high to low)', value: 'ai-desc' },
  { title: 'AI fit (low to high)', value: 'ai-asc' },
  { title: 'Newest applied', value: 'applied-desc' },
  { title: 'Oldest applied', value: 'applied-asc' },
]

const response = ref<CandidateListResponse>({
  data: [], total: 0, page: 1, pageSize: pageSize.value, totalPages: 0,
})

const snack = reactive({ open: false, text: '' })
function notify(text: string) { snack.text = text; snack.open = true }

async function load() {
  try {
    // When all (or zero) stages are selected, send no stage filter (= all stages).
    const stageParam =
      stages.value.length === 1 ? stages.value[0] : undefined
    response.value = await store.fetchCandidates({
      page: page.value,
      pageSize: pageSize.value,
      q: search.value.trim() || undefined,
      stage: stageParam,
      jobId: jobId.value,
      scoreMin: scoreMin.value,
      scoreMax: scoreMax.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
  } catch {
    notify(store.error ?? 'Failed to load candidates.')
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch(v: string) {
  search.value = v
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
}

function onSort(key: string) {
  sortKey.value = key
  const map: Record<string, ['appliedAt' | 'aiFitScore', 'asc' | 'desc']> = {
    'ai-desc': ['aiFitScore', 'desc'],
    'ai-asc': ['aiFitScore', 'asc'],
    'applied-desc': ['appliedAt', 'desc'],
    'applied-asc': ['appliedAt', 'asc'],
  }
  ;[sortBy.value, sortOrder.value] = map[key]
  page.value = 1
  load()
}

function onStages(s: ApplicationStage[]) { stages.value = s; page.value = 1; load() }
function onJob(id: string | undefined) { jobId.value = id; page.value = 1; load() }
function onRange(r: { key?: string; min?: number; max?: number }) {
  rangeKey.value = r.key
  scoreMin.value = r.min
  scoreMax.value = r.max
  page.value = 1
  load()
}
function onPage(p: number) { page.value = p; load() }
function onPageSize(s: number) { pageSize.value = s; page.value = 1; load() }

function onOptions(o: { page: number; pageSize: number; sortBy: 'appliedAt' | 'aiFitScore'; sortOrder: 'asc' | 'desc' }) {
  const sortChanged = o.sortBy !== sortBy.value || o.sortOrder !== sortOrder.value
  const sizeChanged = o.pageSize !== pageSize.value
  const pageChanged = o.page !== page.value
  if (!sortChanged && !sizeChanged && !pageChanged) return
  sortBy.value = o.sortBy
  sortOrder.value = o.sortOrder
  pageSize.value = o.pageSize
  page.value = sortChanged || sizeChanged ? 1 : o.page
  load()
}

onMounted(() => {
  load()
  store.fetchFacets().catch(() => { /* non-critical */ })
})
</script>

<style scoped>
.candidates-page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: flex-end; gap: 16px; }
.crumb { font-size: 12.5px; margin-bottom: 6px; }
.match-count { margin-left: auto; font-size: 12px; color: var(--hf-text-muted); }
.match-count strong { color: var(--hf-text); }
.toolbar { display: flex; align-items: center; gap: 10px; }
.search { max-width: 360px; flex: 1; }
.sort { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.sort :deep(.v-select) { min-width: 190px; }
.body-grid { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: flex-start; }
.table-wrap { padding: 0; overflow: hidden; }
</style>
```

> Note on `auth.user?.company?.name`: confirm the auth store's user shape. If the company name lives elsewhere (e.g. `auth.company?.name`), use that path — read `src/stores/auth.store.ts` first and match the existing Dashboard greeting/workspace source.

- [ ] **Step 2: Add the route**

In `router/index.ts`, inside the RecruiterLayout `children` array (after the `/jobs/:id/edit` entry), add:

```ts
        {
          path: '/candidates',
          name: 'candidates',
          component: () => import('@/views/CandidatesList.vue'),
        },
        {
          path: '/candidates/:id',
          name: 'candidate-detail',
          component: () => import('@/views/CandidateDetail.vue'),
          props: true,
        },
```

> The `CandidateDetail.vue` import resolves in Task 10. If executing strictly task-by-task and the typecheck for this task fails only on the missing `CandidateDetail.vue`, you may temporarily point both routes at `CandidatesList.vue` and fix in Task 10, OR do Task 10 before re-running this typecheck. Prefer doing Task 9+10 then re-verifying.

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0 (after Task 10 exists) — the list view itself is type-clean. Stop for user review.

---

## Task 9: Frontend — detail sub-components (ring, resume, timeline)

**Files:**
- Create: `apps/frontend/src/components/candidates/CandidateFitRing.vue`
- Create: `apps/frontend/src/components/candidates/CandidateResumePanel.vue`
- Create: `apps/frontend/src/components/candidates/CandidateTimeline.vue`

**Interfaces:**
- `CandidateFitRing` props: `score: number | null`, `model?: string`.
- `CandidateResumePanel` props: `text: string | null`, `filename: string | null`, `downloading: boolean`; emits `download`.
- `CandidateTimeline` props: `appliedAt: string`, `currentStage: ApplicationStage`.

- [ ] **Step 1: CandidateFitRing**

```vue
<template>
  <div class="fit-ring">
    <div v-if="score != null" class="hf-ring" :style="ringStyle">
      <div class="hf-ring-inner">
        <div class="hf-ring-num">{{ score }}</div>
        <div class="hf-ring-lbl">AI fit</div>
      </div>
    </div>
    <div v-else class="ring-empty">Not scored yet</div>
    <div v-if="model" class="ring-model">Scored by {{ model }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ score: number | null; model?: string }>()
const ringStyle = computed(() => {
  const pct = props.score ?? 0
  const color = pct >= 80 ? 'var(--hf-accent)' : pct >= 60 ? 'var(--hf-primary)' : 'var(--hf-warn)'
  return { '--pct': String(pct), '--ring-color': color } as Record<string, string>
})
</script>

<style scoped>
.fit-ring { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.ring-empty {
  width: 132px; height: 132px; border-radius: 50%;
  border: 2px dashed var(--hf-border);
  display: grid; place-items: center;
  font-size: 12px; color: var(--hf-text-subtle); text-align: center; padding: 0 16px;
}
.ring-model { font-size: 11px; color: var(--hf-text-subtle); }
</style>
```

- [ ] **Step 2: CandidateResumePanel**

```vue
<template>
  <div class="resume-panel">
    <div class="resume-head">
      <div class="resume-title">Resume</div>
      <span v-if="filename" class="hf-muted resume-file">{{ filename }}</span>
      <AppButton
        v-if="text"
        variant="ghost"
        :loading="downloading"
        class="resume-dl"
        @click="emit('download')"
      >
        <HfIcon name="download" :size="14" />Download
      </AppButton>
    </div>
    <div v-if="text" class="hf-resume">{{ text }}</div>
    <div v-else class="resume-empty">No resume on file.</div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue'
import HfIcon from '@/components/common/HfIcon.vue'
defineProps<{ text: string | null; filename: string | null; downloading: boolean }>()
const emit = defineEmits<{ download: [] }>()
</script>

<style scoped>
.resume-panel { display: flex; flex-direction: column; gap: 10px; }
.resume-head { display: flex; align-items: center; gap: 8px; }
.resume-title { font-size: 13px; font-weight: 600; }
.resume-file { font-size: 11.5px; }
.resume-dl { margin-left: auto; }
.resume-empty { font-size: 12.5px; color: var(--hf-text-subtle); }
</style>
```

- [ ] **Step 3: CandidateTimeline**

A minimal, honest 2-item timeline (Applied → current stage), built from real data only.

```vue
<template>
  <div class="hf-timeline">
    <div class="hf-tl-item">
      <div class="hf-tl-dot done"><HfIcon name="check" :size="11" /></div>
      <div>
        <div class="hf-tl-title">Applied</div>
        <div class="hf-tl-sub">{{ appliedLabel }}</div>
      </div>
    </div>
    <div class="hf-tl-item">
      <div class="hf-tl-dot current" />
      <div>
        <div class="hf-tl-title">Current stage</div>
        <div class="hf-tl-sub">{{ STAGE_LABELS[currentStage] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'
import type { ApplicationStage } from '@/types/candidate'
import { STAGE_LABELS } from '@/types/candidate'
const props = defineProps<{ appliedAt: string; currentStage: ApplicationStage }>()
const appliedLabel = computed(() =>
  new Date(props.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
)
</script>
```

- [ ] **Step 4: Verify typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. Stop for user review.

---

## Task 10: Frontend — CandidateDetail view

**Files:**
- Create: `apps/frontend/src/views/CandidateDetail.vue`

**Interfaces:**
- Consumes: `useCandidatesStore`, `CandidateFitRing`, `CandidateResumePanel`, `CandidateTimeline`, `HfIcon`, `AppButton`, `CandidateDetail` type. Route prop `id: string`.

- [ ] **Step 1: Build the view**

Create `CandidateDetail.vue`:

```vue
<template>
  <div class="detail-page">
    <!-- Back -->
    <button class="back" @click="router.push('/candidates')">
      <HfIcon name="chevronLeft" :size="16" />Back to candidates
    </button>

    <!-- Loading skeleton -->
    <div v-if="loading" class="hf-card detail-card">
      <v-skeleton-loader type="article, paragraph" />
    </div>

    <!-- Not found -->
    <div v-else-if="!candidate" class="hf-card detail-card empty">
      Candidate not found.
    </div>

    <!-- Content -->
    <template v-else>
      <div class="hf-card detail-card">
        <!-- Identity -->
        <div class="identity">
          <span class="hf-avatar lg">{{ initials }}</span>
          <div class="ident-main">
            <h2 class="ident-name">{{ candidate.candidate.fullName }}</h2>
            <div class="hf-muted ident-role">Applying for {{ candidate.job.title }}</div>
            <div class="ident-contacts">
              <span><HfIcon name="mail" :size="13" />{{ candidate.candidate.email }}</span>
              <span v-if="candidate.candidate.phone"><HfIcon name="phone" :size="13" />{{ candidate.candidate.phone }}</span>
              <a v-if="candidate.candidate.linkedinUrl" :href="candidate.candidate.linkedinUrl" target="_blank" rel="noopener">
                <HfIcon name="link" :size="13" />LinkedIn
              </a>
            </div>
          </div>
          <span class="hf-stage" :class="candidate.currentStage.toLowerCase()">
            {{ STAGE_LABELS[candidate.currentStage] }}
          </span>
        </div>
      </div>

      <!-- AI fit + timeline -->
      <div class="two-col">
        <div class="hf-card panel">
          <div class="panel-title">AI fit</div>
          <CandidateFitRing :score="candidate.aiFitScore" :model="scoreModel" />
        </div>
        <div class="hf-card panel">
          <div class="panel-title">Application timeline</div>
          <CandidateTimeline :applied-at="candidate.appliedAt" :current-stage="candidate.currentStage" />
        </div>
      </div>

      <!-- Resume -->
      <div class="hf-card panel">
        <CandidateResumePanel
          :text="candidate.resumeText"
          :filename="candidate.resumeFilename"
          :downloading="downloading"
          @download="onDownload"
        />
      </div>
    </template>

    <v-snackbar v-model="snack.open" :timeout="2600" location="bottom right">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCandidatesStore } from '@/stores/candidates.store'
import type { CandidateDetail } from '@/types/candidate'
import { STAGE_LABELS } from '@/types/candidate'
import CandidateFitRing from '@/components/candidates/CandidateFitRing.vue'
import CandidateResumePanel from '@/components/candidates/CandidateResumePanel.vue'
import CandidateTimeline from '@/components/candidates/CandidateTimeline.vue'
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const store = useCandidatesStore()

const candidate = ref<CandidateDetail | null>(null)
const loading = ref(true)
const downloading = ref(false)
const snack = reactive({ open: false, text: '' })

const initials = computed(() =>
  (candidate.value?.candidate.fullName ?? '')
    .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
)
const scoreModel = computed(() => candidate.value?.aiScoreDetails?.model)

async function onDownload() {
  if (!candidate.value) return
  downloading.value = true
  try {
    const url = await store.fetchResumeUrl(candidate.value.id)
    window.open(url, '_blank', 'noopener')
  } catch {
    snack.text = 'Failed to open resume.'
    snack.open = true
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  try {
    candidate.value = await store.fetchCandidate(props.id)
  } catch {
    candidate.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail-page { display: flex; flex-direction: column; gap: 18px; max-width: 920px; }
.back {
  display: inline-flex; align-items: center; gap: 4px;
  background: none; border: 0; cursor: pointer;
  font-size: 13px; color: var(--hf-text-muted); padding: 0;
}
.back:hover { color: var(--hf-text); }
.detail-card { padding: 22px; }
.detail-card.empty { text-align: center; color: var(--hf-text-muted); font-size: 13px; }
.identity { display: flex; gap: 16px; align-items: flex-start; }
.hf-avatar.lg { width: 56px; height: 56px; font-size: 18px; }
.ident-main { flex: 1; }
.ident-name { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
.ident-role { margin-top: 4px; font-size: 13px; }
.ident-contacts { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; font-size: 12.5px; color: var(--hf-text-muted); }
.ident-contacts span, .ident-contacts a { display: inline-flex; align-items: center; gap: 5px; color: inherit; text-decoration: none; }
.ident-contacts a:hover { color: var(--hf-primary); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.panel { padding: 22px; }
.panel-title { font-size: 13px; font-weight: 600; margin-bottom: 16px; }
</style>
```

> Note: `hf-avatar` base styling is already in `hireflow.css`; the `.lg` modifier here just enlarges it. If `hf-avatar` does not center its initials at the larger size, add `display:grid;place-items:center` to the `.lg` rule.

- [ ] **Step 2: Verify typecheck (full)**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. Stop for user review.

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Backend — full test + build typecheck**

Run: `cd apps/backend && npx jest --silent && npx tsc --noEmit -p tsconfig.json`
Expected: all Jest suites green; tsc exit 0.

- [ ] **Step 2: Frontend — typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exit 0.

- [ ] **Step 3: Manual smoke checklist (hand to user — do NOT auto-run; needs a logged-in recruiter + running ml/back/front stack)**

  - `/candidates` lists real applications; empty state shows when none.
  - Stage / Job / AI-fit sidebar checkboxes filter the list; counts shown.
  - Search by name/email narrows results (debounced).
  - Sort dropdown reorders by AI fit / applied date.
  - Pagination prev/next + rows-per-page work; "Showing N–M of T candidates".
  - Clicking a row opens `/candidates/:id` full-screen detail.
  - Detail shows identity, AI-fit ring (or "Not scored yet"), timeline, resume text + Download (opens signed URL).
  - Cross-tenant / bad id → "Candidate not found".
  - No write/action buttons anywhere.

- [ ] **Step 4: Report results to user (no commit, no merge).**

---

## Self-Review (author checklist — completed)

- **Spec coverage:** List screen (Tasks 6–8), Detail screen (Tasks 9–10), backend list filters (1), facets (2), detail endpoint (3), store/types (4), shared bits (5), verification (11). Drop-list items (source/location/exp/starred/bulk/actions/breakdown/notes) are simply not built — covered by omission per spec.
- **Placeholder scan:** No TBD/TODO. Two explicit "read the existing file and match its shape" notes (HfIcon icon-map format, auth store company path) are real adaptation instructions, not placeholders.
- **Type consistency:** `CandidateListItem`/`CandidateDetail`/`CandidateFacets`/`CandidateListQuery` defined in Task 4 and consumed identically in Tasks 6–10. `update:options` payload shape matches between CandidatesTable (Task 7) and CandidatesList (Task 8). Backend `getFacets`/`findOne` signatures match controller calls.
- **Known deviation (intentional):** facet counts are company-scoped totals, not reactive to other active filters (Global Constraints).
