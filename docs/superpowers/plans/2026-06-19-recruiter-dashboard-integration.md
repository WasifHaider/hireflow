# Recruiter Dashboard Backend Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data in the recruiter dashboard with two new tenant-scoped backend endpoints (`GET /applications`, `GET /dashboard/summary`) wired into `Dashboard.vue` via a new Pinia store.

**Architecture:** Backend adds a reusable paginated applications list (extending the existing `ApplicationsModule`) and a new `DashboardModule` for aggregates (counts, avg score, stage funnel, 7-day timeseries). Frontend adds `dashboard.store.ts` that loads both endpoints on mount and binds them to the existing dashboard widgets. Read-only — no stage mutations.

**Tech Stack:** NestJS 11, Prisma 6, class-validator DTOs, Jest (unit, mocked Prisma). Vue 3 + Pinia + axios + Vuetify.

---

## Design Deviations From Spec (confirm at plan review)

1. **Response envelope:** `GET /applications` returns `{ data, total, page, pageSize, totalPages }` (matching the existing `GET /jobs` convention) instead of the spec's `{ items, ..., limit }`. Reason: codebase consistency / DRY.
2. **Stat-card trend pills + foot lines:** the mock shows trend pills (`+2`, `+18%`) and comparison foot text. We have no historical period to compute these. The plan **removes the trend pills** and replaces foot text with honest static labels. No fake comparisons shipped. (If you'd rather keep period-over-period trends, that needs a separate historical-aggregation task — out of scope here.)

---

## File Structure

**Backend (create):**
- `apps/backend/src/applications/dto/list-applications-query.dto.ts` — query validation for the list
- `apps/backend/src/applications/dto/application-list-item.dto.ts` — list item + paginated response shape (Swagger)
- `apps/backend/src/dashboard/dashboard.module.ts`
- `apps/backend/src/dashboard/dashboard.controller.ts`
- `apps/backend/src/dashboard/dashboard.service.ts`
- `apps/backend/src/dashboard/dto/dashboard-summary-response.dto.ts`
- `apps/backend/src/dashboard/dashboard.service.spec.ts` — unit tests (mocked Prisma)
- `apps/backend/src/applications/applications.service.spec.ts` — unit tests (mocked Prisma)

**Backend (modify):**
- `apps/backend/src/applications/applications.service.ts` — add `findAll`
- `apps/backend/src/applications/applications.controller.ts` — add `GET /applications`
- `apps/backend/src/app.module.ts` — register `DashboardModule`

**Frontend (create):**
- `apps/frontend/src/types/dashboard.ts` — API response types
- `apps/frontend/src/stores/dashboard.store.ts` — Pinia store

**Frontend (modify):**
- `apps/frontend/src/views/Dashboard.vue` — replace mock blocks with store data

---

## Task 1: Applications list query DTO

**Files:**
- Create: `apps/backend/src/applications/dto/list-applications-query.dto.ts`

- [ ] **Step 1: Write the DTO**

Mirrors the existing `ListJobsQueryDto` transform/validation style (`apps/backend/src/jobs/dto/list-jobs-query.dto.ts`).

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const SORT_BY_FIELDS = ['appliedAt', 'aiFitScore'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export type ApplicationSortBy = (typeof SORT_BY_FIELDS)[number];
export type ApplicationSortOrder = (typeof SORT_ORDERS)[number];

export class ListApplicationsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === '') return 1;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === '') return 20;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ description: 'Filter by job id' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ enum: ApplicationStage })
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  @ApiPropertyOptional({ enum: SORT_BY_FIELDS, default: 'appliedAt' })
  @IsOptional()
  @IsIn([...SORT_BY_FIELDS])
  sortBy: ApplicationSortBy = 'appliedAt';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn([...SORT_ORDERS])
  sortOrder: ApplicationSortOrder = 'desc';
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/applications/dto/list-applications-query.dto.ts
git commit -m "feat(backend): add applications list query DTO"
```

---

## Task 2: Applications list response DTO

**Files:**
- Create: `apps/backend/src/applications/dto/application-list-item.dto.ts`

- [ ] **Step 1: Write the DTO**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';

class ApplicationListCandidateDto {
  @ApiProperty({ example: 'Sarah Chen' })
  fullName!: string;

  @ApiProperty({ example: 'sarah.chen@hey.com' })
  email!: string;
}

class ApplicationListJobDto {
  @ApiProperty({ example: 'b6c1...' })
  id!: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  title!: string;
}

export class ApplicationListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: ApplicationListCandidateDto })
  candidate!: ApplicationListCandidateDto;

  @ApiProperty({ type: ApplicationListJobDto })
  job!: ApplicationListJobDto;

  @ApiProperty({ enum: ApplicationStage })
  currentStage!: ApplicationStage;

  @ApiProperty({ nullable: true, example: 92 })
  aiFitScore!: number | null;

  @ApiProperty()
  appliedAt!: Date;
}

export class ApplicationListResponseDto {
  @ApiProperty({ type: [ApplicationListItemDto] })
  data!: ApplicationListItemDto[];

  @ApiProperty({ example: 284 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 15 })
  totalPages!: number;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/applications/dto/application-list-item.dto.ts
git commit -m "feat(backend): add applications list response DTO"
```

---

## Task 3: ApplicationsService.findAll (TDD)

**Files:**
- Modify: `apps/backend/src/applications/applications.service.ts`
- Create: `apps/backend/src/applications/applications.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Unit test with a mocked Prisma client (no DB). `$transaction` is mocked to resolve to `[rows, count]`.

```typescript
import { Test } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';

describe('ApplicationsService.findAll', () => {
  let service: ApplicationsService;
  let prisma: {
    application: { findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      application: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
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

  it('scopes the query to companyId and paginates', async () => {
    const rows = [
      {
        id: 'a1',
        currentStage: 'APPLIED',
        aiFitScore: 92,
        appliedAt: new Date('2026-06-18'),
        candidate: { fullName: 'Sarah Chen', email: 's@hey.com' },
        job: { id: 'j1', title: 'Backend' },
      },
    ];
    prisma.application.findMany.mockResolvedValue(rows);
    prisma.application.count.mockResolvedValue(1);

    const query = Object.assign(new ListApplicationsQueryDto(), {
      page: 1,
      pageSize: 20,
      sortBy: 'appliedAt',
      sortOrder: 'desc',
    });
    const result = await service.findAll(query, 'company-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1' },
        orderBy: { appliedAt: 'desc' },
        skip: 0,
        take: 20,
      }),
    );
    expect(result).toEqual({
      data: rows,
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it('applies jobId and stage filters when present', async () => {
    prisma.application.findMany.mockResolvedValue([]);
    prisma.application.count.mockResolvedValue(0);
    const query = Object.assign(new ListApplicationsQueryDto(), {
      page: 1,
      pageSize: 20,
      sortBy: 'aiFitScore',
      sortOrder: 'asc',
      jobId: 'job-9',
      stage: 'INTERVIEW',
    });

    await service.findAll(query, 'company-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', jobId: 'job-9', currentStage: 'INTERVIEW' },
        orderBy: { aiFitScore: 'asc' },
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest applications.service.spec -t findAll`
Expected: FAIL — `service.findAll is not a function`.

- [ ] **Step 3: Implement findAll**

Add to `apps/backend/src/applications/applications.service.ts`. Add `Prisma` to the `@prisma/client` import and import the query DTO.

```typescript
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { Prisma } from '@prisma/client';
```

```typescript
async findAll(query: ListApplicationsQueryDto, companyId: string) {
  const where: Prisma.ApplicationWhereInput = { companyId };
  if (query.jobId) where.jobId = query.jobId;
  if (query.stage) where.currentStage = query.stage;

  const skip = (query.page - 1) * query.pageSize;
  const orderBy: Prisma.ApplicationOrderByWithRelationInput = {
    [query.sortBy]: query.sortOrder,
  };

  const [data, total] = await this.prisma.$transaction([
    this.prisma.application.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
      select: {
        id: true,
        currentStage: true,
        aiFitScore: true,
        appliedAt: true,
        candidate: { select: { fullName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    }),
    this.prisma.application.count({ where }),
  ]);

  return {
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest applications.service.spec`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/applications/applications.service.ts apps/backend/src/applications/applications.service.spec.ts
git commit -m "feat(backend): applications findAll list with tenant scope + filters"
```

---

## Task 4: GET /applications endpoint

**Files:**
- Modify: `apps/backend/src/applications/applications.controller.ts`

- [ ] **Step 1: Add the route**

Add imports and the handler. Keep the existing `getResumeUrl` method.

```typescript
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { ApplicationListResponseDto } from './dto/application-list-item.dto';
```

```typescript
@Get()
@ApiOperation({ summary: 'List applications for the current company (paginated)' })
@ApiResponse({ status: 200, description: 'Paginated applications', type: ApplicationListResponseDto })
@ApiResponse({ status: 401, description: 'Unauthorized' })
findAll(
  @Query() query: ListApplicationsQueryDto,
  @CurrentUser() user: SafeUser,
): Promise<ApplicationListResponseDto> {
  return this.applicationsService.findAll(query, user.companyId);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke (optional, requires running backend + token)**

Run: `curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3200/applications?limit=6" | head`
Expected: JSON `{ data: [...], total, page, pageSize, totalPages }`. (Skip if no live server — covered by unit tests.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/applications/applications.controller.ts
git commit -m "feat(backend): GET /applications paginated list endpoint"
```

---

## Task 5: Dashboard summary response DTO

**Files:**
- Create: `apps/backend/src/dashboard/dto/dashboard-summary-response.dto.ts`

- [ ] **Step 1: Write the DTO**

```typescript
import { ApiProperty } from '@nestjs/swagger';

class DashboardStatsDto {
  @ApiProperty({ example: 12 })
  activeJobs!: number;

  @ApiProperty({ example: 284 })
  totalApplications!: number;

  @ApiProperty({ example: 78, description: 'Average aiFitScore across scored applications (0 if none)' })
  avgAiScore!: number;

  @ApiProperty({ example: 31, description: 'Applications still in APPLIED stage' })
  awaitingReview!: number;
}

class PipelineCountsDto {
  @ApiProperty({ example: 142 }) APPLIED!: number;
  @ApiProperty({ example: 68 }) SCREENED!: number;
  @ApiProperty({ example: 24 }) INTERVIEW!: number;
  @ApiProperty({ example: 6 }) OFFER!: number;
  @ApiProperty({ example: 3 }) HIRED!: number;
  @ApiProperty({ example: 9 }) REJECTED!: number;
}

class ApplicationsPerDayDto {
  @ApiProperty({ example: '2026-06-18' })
  date!: string;

  @ApiProperty({ example: 22 })
  count!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: DashboardStatsDto })
  stats!: DashboardStatsDto;

  @ApiProperty({ type: PipelineCountsDto })
  pipeline!: PipelineCountsDto;

  @ApiProperty({ type: [ApplicationsPerDayDto], description: 'Last 7 calendar days, zero-filled' })
  applicationsPerDay!: ApplicationsPerDayDto[];
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/dashboard/dto/dashboard-summary-response.dto.ts
git commit -m "feat(backend): add dashboard summary response DTO"
```

---

## Task 6: DashboardService.getSummary (TDD)

**Files:**
- Create: `apps/backend/src/dashboard/dashboard.service.ts`
- Create: `apps/backend/src/dashboard/dashboard.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Mocks every Prisma call the service makes. Verifies pipeline zero-fill (missing enum keys → 0) and that timeseries returns 7 entries.

```typescript
import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService.getSummary', () => {
  let service: DashboardService;
  let prisma: {
    job: { count: jest.Mock };
    application: { count: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      job: { count: jest.fn() },
      application: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('builds stats, zero-filled pipeline, and 7-day timeseries', async () => {
    prisma.job.count.mockResolvedValue(12); // activeJobs
    prisma.application.count
      .mockResolvedValueOnce(284) // totalApplications
      .mockResolvedValueOnce(31); // awaitingReview
    prisma.application.aggregate.mockResolvedValue({ _avg: { aiFitScore: 77.6 } });
    prisma.application.groupBy.mockResolvedValue([
      { currentStage: 'APPLIED', _count: 142 },
      { currentStage: 'INTERVIEW', _count: 24 },
    ]);
    prisma.$queryRaw.mockResolvedValue([{ date: '2026-06-18', count: 22 }]);

    const result = await service.getSummary('company-1');

    expect(result.stats).toEqual({
      activeJobs: 12,
      totalApplications: 284,
      avgAiScore: 78, // rounded
      awaitingReview: 31,
    });
    // every stage present, missing ones zero-filled
    expect(result.pipeline).toEqual({
      APPLIED: 142, SCREENED: 0, INTERVIEW: 24, OFFER: 0, HIRED: 0, REJECTED: 0,
    });
    // 7 calendar days, zero-filled, the raw row merged in
    expect(result.applicationsPerDay).toHaveLength(7);
    const filled = result.applicationsPerDay.find((d) => d.date === '2026-06-18');
    expect(filled?.count).toBe(22);
    const empty = result.applicationsPerDay.find((d) => d.date !== '2026-06-18');
    expect(empty?.count).toBe(0);
  });

  it('returns avgAiScore 0 when no scored applications', async () => {
    prisma.job.count.mockResolvedValue(0);
    prisma.application.count.mockResolvedValue(0);
    prisma.application.aggregate.mockResolvedValue({ _avg: { aiFitScore: null } });
    prisma.application.groupBy.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getSummary('company-1');
    expect(result.stats.avgAiScore).toBe(0);
    expect(result.pipeline.APPLIED).toBe(0);
    expect(result.applicationsPerDay.every((d) => d.count === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest dashboard.service.spec`
Expected: FAIL — cannot find module `./dashboard.service`.

- [ ] **Step 3: Implement the service**

```typescript
import { Injectable } from '@nestjs/common';
import { ApplicationStage, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

const STAGES: ApplicationStage[] = [
  'APPLIED',
  'SCREENED',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
];
const TIMESERIES_DAYS = 7;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId: string): Promise<DashboardSummaryResponseDto> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (TIMESERIES_DAYS - 1));

    const [activeJobs, totalApplications, awaitingReview, avgAgg, stageGroups, perDayRows] =
      await Promise.all([
        this.prisma.job.count({
          where: { companyId, status: 'PUBLISHED', deletedAt: null },
        }),
        this.prisma.application.count({ where: { companyId } }),
        this.prisma.application.count({
          where: { companyId, currentStage: 'APPLIED' },
        }),
        this.prisma.application.aggregate({
          where: { companyId, aiFitScore: { not: null } },
          _avg: { aiFitScore: true },
        }),
        this.prisma.application.groupBy({
          by: ['currentStage'],
          where: { companyId },
          _count: true,
        }),
        this.prisma.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
          SELECT to_char(date_trunc('day', applied_at), 'YYYY-MM-DD') AS date,
                 count(*)::int AS count
          FROM applications
          WHERE company_id = ${companyId}::uuid
            AND applied_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `),
      ]);

    const pipeline = STAGES.reduce(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<ApplicationStage, number>,
    );
    for (const g of stageGroups) {
      pipeline[g.currentStage] = typeof g._count === 'number' ? g._count : 0;
    }

    const byDate = new Map(perDayRows.map((r) => [r.date, Number(r.count)]));
    const applicationsPerDay = Array.from({ length: TIMESERIES_DAYS }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const date = d.toISOString().slice(0, 10);
      return { date, count: byDate.get(date) ?? 0 };
    });

    return {
      stats: {
        activeJobs,
        totalApplications,
        avgAiScore: Math.round(avgAgg._avg.aiFitScore ?? 0),
        awaitingReview,
      },
      pipeline,
      applicationsPerDay,
    };
  }
}
```

Note: `setHours(0,0,0,0)` then building dates via `toISOString().slice(0,10)` keeps the JS day keys aligned with the SQL `to_char(... 'YYYY-MM-DD')` keys. Test mocks `$queryRaw` so DB date semantics are not under test here.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest dashboard.service.spec`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/dashboard/dashboard.service.ts apps/backend/src/dashboard/dashboard.service.spec.ts
git commit -m "feat(backend): dashboard summary aggregation service"
```

---

## Task 7: DashboardController + module registration

**Files:**
- Create: `apps/backend/src/dashboard/dashboard.controller.ts`
- Create: `apps/backend/src/dashboard/dashboard.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Write the controller**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecruiterAuthGuard } from '../auth/guards/recruiter-auth.guard';
import type { SafeUser } from '../auth/types/safe-user.type';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(RecruiterAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated recruiter dashboard summary (stats, pipeline, 7-day timeseries)' })
  @ApiResponse({ status: 200, description: 'Dashboard summary', type: DashboardSummaryResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSummary(@CurrentUser() user: SafeUser): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(user.companyId);
  }
}
```

- [ ] **Step 2: Write the module**

Follows `ApplicationsModule` (imports `AuthModule` so the guard's deps resolve).

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

- [ ] **Step 3: Register in app.module.ts**

Add the import and list it in `imports` (alphabetical neighbors shown):

```typescript
import { DashboardModule } from './dashboard/dashboard.module';
```

In the `imports` array, add `DashboardModule` after `CandidateModule`:

```typescript
    CandidateModule,
    DashboardModule,
    JobsModule,
```

- [ ] **Step 4: Build to verify wiring**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full backend unit suite**

Run: `cd apps/backend && npx jest`
Expected: PASS (existing app.controller.spec + new applications/dashboard specs).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/dashboard/dashboard.controller.ts apps/backend/src/dashboard/dashboard.module.ts apps/backend/src/app.module.ts
git commit -m "feat(backend): dashboard controller + module registration"
```

---

## Task 8: Frontend types + dashboard store

**Files:**
- Create: `apps/frontend/src/types/dashboard.ts`
- Create: `apps/frontend/src/stores/dashboard.store.ts`

- [ ] **Step 1: Write the types**

```typescript
export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'

export interface ApplicationListItem {
  id: string
  candidate: { fullName: string; email: string }
  job: { id: string; title: string }
  currentStage: ApplicationStage
  aiFitScore: number | null
  appliedAt: string
}

export interface ApplicationListResponse {
  data: ApplicationListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DashboardSummary {
  stats: {
    activeJobs: number
    totalApplications: number
    avgAiScore: number
    awaitingReview: number
  }
  pipeline: Record<ApplicationStage, number>
  applicationsPerDay: { date: string; count: number }[]
}
```

- [ ] **Step 2: Write the store**

Loads both endpoints in parallel; exposes loading/error. Mirrors the `auth.store.ts` composition style.

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/plugins/axios'
import { getApiErrorMessage } from '@/plugins/axios'
import type {
  ApplicationListItem,
  ApplicationListResponse,
  DashboardSummary,
} from '@/types/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<DashboardSummary | null>(null)
  const recentApplications = ref<ApplicationListItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [summaryRes, recentRes] = await Promise.all([
        api.get<DashboardSummary>('/dashboard/summary'),
        api.get<ApplicationListResponse>('/applications', {
          params: { pageSize: 6, sortBy: 'appliedAt', sortOrder: 'desc' },
        }),
      ])
      summary.value = summaryRes.data
      recentApplications.value = recentRes.data.data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load dashboard.')
    } finally {
      loading.value = false
    }
  }

  return { summary, recentApplications, loading, error, load }
})
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/types/dashboard.ts apps/frontend/src/stores/dashboard.store.ts
git commit -m "feat(frontend): dashboard types + Pinia store"
```

---

## Task 9: Wire Dashboard.vue to the store

**Files:**
- Modify: `apps/frontend/src/views/Dashboard.vue`

This replaces the `<script setup>` mock constants with derived store data and updates the template bindings. The visual classes/markup stay; only data sources and a few labels change.

- [ ] **Step 1: Replace the `<script setup>` block**

Replace everything between `<script setup lang="ts">` and `</script>` with:

```typescript
import { computed, onMounted } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'
import AppDataTable, { type Column } from '@/components/common/AppDataTable.vue'
import ApplicationsLineChart from '@/components/common/ApplicationsLineChart.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import type { ApplicationStage } from '@/types/dashboard'

/* Recruiter dashboard — real data from the dashboard store. Greeting + workspace
   come from the auth store (GET /auth/me, hydrated on mount/refresh). */
const authStore = useAuthStore()
const dashboard = useDashboardStore()

const firstName = computed(() => (authStore.userFullName || 'there').split(' ')[0])

onMounted(() => {
  void dashboard.load()
})

const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  SCREENED: 'Screened',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
}

// Forward funnel stages shown in the pipeline widget (REJECTED excluded).
const FUNNEL: ApplicationStage[] = ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED']

const stats = computed(() => {
  const s = dashboard.summary?.stats
  return [
    { label: 'Active jobs', value: String(s?.activeJobs ?? 0), suffix: '', foot: 'published roles' },
    { label: 'Total applications', value: String(s?.totalApplications ?? 0), suffix: '', foot: 'all time' },
    { label: 'Avg AI score', value: String(s?.avgAiScore ?? 0), suffix: '/100', foot: 'across scored applications' },
    { label: 'Awaiting review', value: String(s?.awaitingReview ?? 0), suffix: '', foot: 'in Applied stage' },
  ]
})

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const day = 86_400_000
  if (diffMs < day && new Date(iso).getDate() === new Date().getDate()) {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  const days = Math.floor(diffMs / day)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const candidates = computed(() =>
  dashboard.recentApplications.map((a) => ({
    name: a.candidate.fullName,
    email: a.candidate.email,
    role: a.job.title,
    loc: '',
    score: a.aiFitScore ?? 0,
    stage: STAGE_LABELS[a.currentStage],
    date: timeAgo(a.appliedAt),
  })),
)

const totalThisList = computed(() => dashboard.summary?.stats.totalApplications ?? 0)

const pipeline = computed(() => {
  const counts = dashboard.summary?.pipeline
  const applied = counts?.APPLIED ?? 0
  const base = applied > 0 ? applied : 1
  return FUNNEL.map((stage) => {
    const count = counts?.[stage] ?? 0
    return { name: STAGE_LABELS[stage], count, pct: Math.round((count / base) * 100) }
  })
})

const chartValues = computed(() => (dashboard.summary?.applicationsPerDay ?? []).map((d) => d.count))
const chartLabels = computed(() =>
  (dashboard.summary?.applicationsPerDay ?? []).map((d) =>
    new Date(d.date).toLocaleDateString([], { weekday: 'short' }),
  ),
)
const chartMax = computed(() => Math.max(40, ...chartValues.value))
const chartTotal = computed(() => chartValues.value.reduce((a, b) => a + b, 0))

const appColumns: Column[] = [
  { key: 'name', title: 'Candidate', type: 'avatar', subField: 'email' },
  { key: 'role', title: 'Job', type: 'twoLine', subField: 'loc' },
  { key: 'score', title: 'AI fit', type: 'score' },
  { key: 'stage', title: 'Stage', type: 'stage' },
  { key: 'date', title: 'Applied', type: 'muted' },
  { key: 'actions', title: '', type: 'action', actionLabel: 'Review', width: 110, align: 'end' },
]
</script>
```

- [ ] **Step 2: Update the template bindings**

Make these edits in the `<template>`:

a) Stat cards — remove the trend pill (no real comparison). Replace the `<div class="hf-stat-value">` block (lines ~20-26) with:

```html
        <div class="hf-stat-value">
          {{ s.value }}<span v-if="s.suffix" class="suffix">{{ s.suffix }}</span>
        </div>
        <div class="hf-stat-foot">{{ s.foot }}</div>
```

(Removes `s.trend` and `s.footDot` usage, which no longer exist.)

b) Recent-applications "this week" tag — bind to the real total. Replace:

```html
          <span class="hf-tag neutral" style="margin-left: 4px">284 this week</span>
```

with:

```html
          <span class="hf-tag neutral" style="margin-left: 4px">{{ totalThisList }} total</span>
```

c) Add an empty state under the table. Replace `<AppDataTable :columns="appColumns" :rows="candidates" item-value="name" />` with:

```html
        <AppDataTable
          v-if="dashboard.loading || candidates.length"
          :columns="appColumns"
          :rows="candidates"
          item-value="name"
        />
        <div v-else class="hf-muted" style="padding: 32px 20px; text-align: center; font-size: 13px">
          No applications yet.
        </div>
```

d) Chart header number — replace the hardcoded `147` + trend block (lines ~58-61) with:

```html
              <div class="hf-stat-value" style="margin-top: 2px">{{ chartTotal }}</div>
```

e) Chart binding — replace `<ApplicationsLineChart :values="chartValues" :labels="chartLabels" :max="40" />` with:

```html
          <ApplicationsLineChart :values="chartValues" :labels="chartLabels" :max="chartMax" />
```

f) AI suggestions card — replace the inner suggestions loop (the `<div style="display: flex; flex-direction: column; gap: 8px">...</div>` block, lines ~75-84) with a "Coming soon" empty state:

```html
          <div class="ai-coming-soon">
            <HfIcon name="sparkles" :size="18" />
            <div style="font-size: 12.5px; font-weight: 500">Coming soon</div>
            <div class="hf-cand-sub">AI-powered suggestions land in a future update.</div>
          </div>
```

g) Add the empty-state style inside the `<style scoped>` block:

```css
.ai-coming-soon {
  border: 1px dashed var(--hf-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  color: var(--hf-text-muted);
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors. (If `timeAgo`/`Date.now` lint complains, it won't — this is app runtime code, not a workflow script.)

- [ ] **Step 4: Manual visual check (optional, requires dev server + backend)**

Run: `cd apps/frontend && npm run dev`, sign in as a recruiter, open the dashboard.
Expected: stat cards, recent-applications table, pipeline funnel, and chart show real data (or zeros/empty state for a fresh company); AI card shows "Coming soon".

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/views/Dashboard.vue
git commit -m "feat(frontend): wire recruiter dashboard to real endpoints"
```

---

## Task 10: Confirm /auth/me drives chrome + final verification

**Files:**
- Read-only check: `apps/frontend/src/router/index.ts` (or wherever the route guard calls `authStore.hydrate()`), `apps/frontend/src/components/common/UserMenu.vue`.

- [ ] **Step 1: Verify hydration on refresh**

Confirm the router guard calls `authStore.hydrate()` before resolving protected routes (it already exists in `auth.store.ts`). Greeting (`firstName`) and workspace (`authStore.companyName`) already bind to it. No code change expected — just confirm.

Run: `cd apps/frontend && grep -rn "hydrate" src/router`
Expected: a guard awaits `hydrate()`. If absent, add `await authStore.hydrate()` in the global `beforeEach` guard before the auth check.

- [ ] **Step 2: Verify avatar/name in UserMenu come from the store**

Run: `cd apps/frontend && grep -n "authStore\|userFullName\|avatar" src/components/common/UserMenu.vue`
Expected: name/avatar derive from `authStore`. If hardcoded, bind them to `authStore.userFullName` / `authStore.user?.avatarUrl`.

- [ ] **Step 3: Full frontend typecheck**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Full backend suite**

Run: `cd apps/backend && npx jest`
Expected: all PASS.

- [ ] **Step 5: Commit any guard/UserMenu fix (only if changes were needed)**

```bash
git add -A
git commit -m "fix(frontend): hydrate auth/me for dashboard chrome on refresh"
```

---

## Self-Review

- **Spec coverage:** `GET /applications` (Tasks 1-4) ✓; `GET /dashboard/summary` (Tasks 5-7) ✓; stats/pipeline/timeseries (Task 6) ✓; AI "Coming soon" + "Awaiting review" relabel (Task 9) ✓; dashboard store + wiring (Tasks 8-9) ✓; /auth/me hydration (Task 10) ✓; tenant isolation via `companyId` from JWT (Tasks 3, 6) ✓; sensitive-field exclusion via explicit `select` (Task 3) ✓.
- **Deviations flagged:** response envelope naming + trend-pill removal (top of doc) — both surfaced for plan-review approval.
- **Type consistency:** `findAll(query, companyId)` signature consistent across Tasks 3-4; `DashboardSummaryResponseDto` shape consistent across Tasks 5-7 and frontend `DashboardSummary` (Task 8); `ApplicationStage` keys identical backend/frontend.
- **Out of scope (unchanged):** stage mutations, real AI suggestions, accurate time-to-hire, other recruiter screens.
