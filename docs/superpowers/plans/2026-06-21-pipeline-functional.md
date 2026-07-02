# Pipeline (Kanban) Functional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock pipeline board with a per-job kanban wired to real backend data — drag cards between stages to persist stage changes, plus search, job selector, sort, rejected lane, and card→detail navigation.

**Architecture:** Two new tenant-scoped backend endpoints on the existing `applications` module — `GET /applications/board?jobId=` (all apps for one job, grouped + zero-filled by stage) and `PATCH /applications/:id/stage` (move a card). Frontend gets a Pinia store with optimistic stage moves, a rewritten `Pipeline.vue`, and vuedraggable-powered kanban columns.

**Tech Stack:** NestJS + Prisma (backend), Vue 3 + Pinia + Vuetify + vuedraggable@next (frontend). Jest for backend unit tests, vue-tsc for frontend typecheck.

## Global Constraints

- **Tenant isolation:** every Prisma query filters by `companyId`; tenant-scoped lookups use `findFirst({ where: { id, companyId } })`, NEVER `findUnique`. Cross-tenant access → **404** (not 403).
- **No git commits.** User handles git; leave changes as working-tree diffs (matches recent convention). "Commit" steps below are replaced by verification gates.
- **Loading states:** every screen with an in-flight fetch must show a loading state.
- **Swagger:** every endpoint gets `@ApiOperation` + `@ApiResponse` (200/400/401/404 as applicable).
- **DTOs:** validated with class-validator; global pipe already enforces whitelist + forbidNonWhitelisted.
- **Strip sensitive fields:** explicit `select` only — never leak `resumeText`/`resumeUrl`/`coverLetter`/`passwordHash`/`aiScoreDetails` from list-shaped responses.
- **Stage enum (verbatim):** `ApplicationStage = APPLIED | SCREENED | INTERVIEW | OFFER | HIRED | REJECTED`.
- **Active columns** (rendered as kanban columns): `APPLIED, SCREENED, INTERVIEW, OFFER, HIRED`. `REJECTED` is the lane, not a column.
- **Stage labels:** `APPLIED→Applied, SCREENED→Screened, INTERVIEW→Interview, OFFER→Offer, HIRED→Hired, REJECTED→Rejected`.
- **Frontend verify gate:** `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json` exits 0.
- **Backend verify gate:** `cd apps/backend && npx jest src/applications` green.

---

### Task 1: Backend — `GET /applications/board` (grouped board)

**Files:**
- Create: `apps/backend/src/applications/dto/application-board.dto.ts`
- Modify: `apps/backend/src/applications/applications.service.ts` (add `getBoard`)
- Modify: `apps/backend/src/applications/applications.controller.ts` (add route + imports)
- Test: `apps/backend/src/applications/applications.service.spec.ts` (add `describe('ApplicationsService.getBoard')`)

**Interfaces:**
- Consumes: existing `PrismaService`; existing list-item select shape `{ id, currentStage, aiFitScore, appliedAt, candidate{id,fullName,email}, job{id,title} }`.
- Produces: `getBoard(jobId: string, companyId: string): Promise<ApplicationBoardDto>` where
  ```
  ApplicationBoardDto = {
    job: { id: string; title: string };
    stages: Record<ApplicationStage, BoardItem[]>;   // all 6 keys present
    counts: Record<ApplicationStage, number>;        // all 6 keys present
  }
  BoardItem = { id; currentStage; aiFitScore: number|null; appliedAt: Date;
                candidate: { id; fullName; email }; job: { id; title } }
  ```

- [ ] **Step 1: Write the failing test**

Add to `apps/backend/src/applications/applications.service.spec.ts` (new describe block; reuse the existing prisma mock pattern but extend it with `job.findFirst` and `application.findMany`):

```ts
describe('ApplicationsService.getBoard', () => {
  let service: ApplicationsService;
  let prisma: {
    job: { findFirst: jest.Mock };
    application: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      job: { findFirst: jest.fn() },
      application: { findMany: jest.fn() },
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

  it('404s when the job is not in the company', async () => {
    prisma.job.findFirst.mockResolvedValue(null);
    await expect(service.getBoard('job-x', 'company-1')).rejects.toThrow('Job not found');
    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: { id: 'job-x', companyId: 'company-1' },
      select: { id: true, title: true },
    });
  });

  it('groups applications into zero-filled stages with counts', async () => {
    prisma.job.findFirst.mockResolvedValue({ id: 'job-1', title: 'Backend' });
    prisma.application.findMany.mockResolvedValue([
      { id: 'a1', currentStage: 'APPLIED', aiFitScore: 80, appliedAt: new Date('2026-06-18'),
        candidate: { id: 'c1', fullName: 'Sarah', email: 's@h.com' }, job: { id: 'job-1', title: 'Backend' } },
      { id: 'a2', currentStage: 'APPLIED', aiFitScore: 70, appliedAt: new Date('2026-06-17'),
        candidate: { id: 'c2', fullName: 'Marc', email: 'm@h.com' }, job: { id: 'job-1', title: 'Backend' } },
      { id: 'a3', currentStage: 'HIRED', aiFitScore: 91, appliedAt: new Date('2026-06-10'),
        candidate: { id: 'c3', fullName: 'Alana', email: 'a@h.com' }, job: { id: 'job-1', title: 'Backend' } },
    ]);

    const result = await service.getBoard('job-1', 'company-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', jobId: 'job-1' },
        orderBy: { aiFitScore: 'desc' },
      }),
    );
    expect(result.job).toEqual({ id: 'job-1', title: 'Backend' });
    expect(result.stages.APPLIED).toHaveLength(2);
    expect(result.stages.HIRED).toHaveLength(1);
    expect(result.stages.SCREENED).toEqual([]);
    expect(result.counts).toEqual({ APPLIED: 2, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 1, REJECTED: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/applications/applications.service.spec.ts -t getBoard`
Expected: FAIL — `service.getBoard is not a function`.

- [ ] **Step 3: Create the board DTO**

Create `apps/backend/src/applications/dto/application-board.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';
import { ApplicationListItemDto } from './application-list-item.dto';

class BoardJobDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Senior Backend Engineer' }) title!: string;
}

export class ApplicationBoardDto {
  @ApiProperty({ type: BoardJobDto })
  job!: BoardJobDto;

  @ApiProperty({
    description: 'Applications grouped by stage (all six stage keys always present)',
    example: { APPLIED: [], SCREENED: [], INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [] },
  })
  stages!: Record<ApplicationStage, ApplicationListItemDto[]>;

  @ApiProperty({ example: { APPLIED: 6, SCREENED: 4, INTERVIEW: 3, OFFER: 2, HIRED: 1, REJECTED: 17 } })
  counts!: Record<ApplicationStage, number>;
}
```

- [ ] **Step 4: Implement `getBoard` in the service**

In `apps/backend/src/applications/applications.service.ts`, add the import near the top (with the other DTO imports):

```ts
import { ApplicationBoardDto } from './dto/application-board.dto';
import { ApplicationStage } from '@prisma/client';
```
(If `ApplicationStage` / `NotFoundException` are already imported, don't duplicate.)

Add this method (place it after `findOne`):

```ts
async getBoard(jobId: string, companyId: string): Promise<ApplicationBoardDto> {
  const job = await this.prisma.job.findFirst({
    where: { id: jobId, companyId },
    select: { id: true, title: true },
  });
  if (!job) {
    throw new NotFoundException('Job not found');
  }

  const apps = await this.prisma.application.findMany({
    where: { companyId, jobId },
    orderBy: { aiFitScore: 'desc' },
    select: {
      id: true, currentStage: true, aiFitScore: true, appliedAt: true,
      candidate: { select: { id: true, fullName: true, email: true } },
      job: { select: { id: true, title: true } },
    },
  });

  const stages = {
    APPLIED: [], SCREENED: [], INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [],
  } as Record<ApplicationStage, typeof apps>;
  const counts = {
    APPLIED: 0, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0,
  } as Record<ApplicationStage, number>;

  for (const app of apps) {
    stages[app.currentStage].push(app);
    counts[app.currentStage] += 1;
  }

  return { job, stages, counts } as ApplicationBoardDto;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/applications/applications.service.spec.ts -t getBoard`
Expected: PASS (both cases).

- [ ] **Step 6: Wire the controller route**

In `apps/backend/src/applications/applications.controller.ts`:
- Add import: `import { ApplicationBoardDto } from './dto/application-board.dto';`
- Add the route **before** the `@Get(':id')` route (so `board` isn't captured as a UUID), e.g. right after the `facets` route:

```ts
@Get('board')
@ApiOperation({ summary: 'Get the pipeline board (applications grouped by stage) for one job' })
@ApiResponse({ status: 200, type: ApplicationBoardDto })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Job not found' })
getBoard(
  @Query('jobId', ParseUUIDPipe) jobId: string,
  @CurrentUser() user: SafeUser,
): Promise<ApplicationBoardDto> {
  return this.applicationsService.getBoard(jobId, user.companyId);
}
```

- [ ] **Step 7: Verify gate**

Run: `cd apps/backend && npx jest src/applications && npx tsc --noEmit -p tsconfig.json`
Expected: jest green, tsc exits 0. (Leave as working-tree diff — no commit.)

---

### Task 2: Backend — `PATCH /applications/:id/stage` (move a card)

**Files:**
- Create: `apps/backend/src/applications/dto/update-application-stage.dto.ts`
- Modify: `apps/backend/src/applications/applications.service.ts` (add `updateStage`)
- Modify: `apps/backend/src/applications/applications.controller.ts` (add route + imports)
- Test: `apps/backend/src/applications/applications.service.spec.ts` (add `describe('ApplicationsService.updateStage')`)

**Interfaces:**
- Consumes: `PrismaService`; `ApplicationStage` enum.
- Produces: `updateStage(id: string, companyId: string, stage: ApplicationStage): Promise<ApplicationListItemDto>` — returns the updated row in list-item shape.

- [ ] **Step 1: Write the failing test**

Add to `apps/backend/src/applications/applications.service.spec.ts`:

```ts
describe('ApplicationsService.updateStage', () => {
  let service: ApplicationsService;
  let prisma: {
    application: { findFirst: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      application: { findFirst: jest.fn(), update: jest.fn() },
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

  it('404s when the application is not in the company', async () => {
    prisma.application.findFirst.mockResolvedValue(null);
    await expect(service.updateStage('app-x', 'company-1', 'INTERVIEW' as any))
      .rejects.toThrow('Candidate not found');
    expect(prisma.application.findFirst).toHaveBeenCalledWith({
      where: { id: 'app-x', companyId: 'company-1' },
      select: { id: true, currentStage: true },
    });
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it('updates currentStage and returns the list-item row', async () => {
    prisma.application.findFirst.mockResolvedValue({ id: 'app-1', currentStage: 'APPLIED' });
    const updated = {
      id: 'app-1', currentStage: 'INTERVIEW', aiFitScore: 80, appliedAt: new Date('2026-06-18'),
      candidate: { id: 'c1', fullName: 'Sarah', email: 's@h.com' }, job: { id: 'job-1', title: 'Backend' },
    };
    prisma.application.update.mockResolvedValue(updated);

    const result = await service.updateStage('app-1', 'company-1', 'INTERVIEW' as any);

    expect(prisma.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app-1' },
        data: { currentStage: 'INTERVIEW' },
      }),
    );
    expect(result).toEqual(updated);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/applications/applications.service.spec.ts -t updateStage`
Expected: FAIL — `service.updateStage is not a function`.

- [ ] **Step 3: Create the body DTO**

Create `apps/backend/src/applications/dto/update-application-stage.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateApplicationStageDto {
  @ApiProperty({ enum: ApplicationStage, example: ApplicationStage.INTERVIEW })
  @IsEnum(ApplicationStage)
  stage!: ApplicationStage;
}
```

- [ ] **Step 4: Implement `updateStage` in the service**

In `apps/backend/src/applications/applications.service.ts`, ensure a `Logger` instance exists on the class (add `private readonly logger = new Logger(ApplicationsService.name);` if not present, and import `Logger` from `@nestjs/common`). Add after `getBoard`:

```ts
async updateStage(
  id: string,
  companyId: string,
  stage: ApplicationStage,
): Promise<ApplicationListItemDto> {
  const existing = await this.prisma.application.findFirst({
    where: { id, companyId },
    select: { id: true, currentStage: true },
  });
  if (!existing) {
    throw new NotFoundException('Candidate not found');
  }

  const updated = await this.prisma.application.update({
    where: { id },
    data: { currentStage: stage },
    select: {
      id: true, currentStage: true, aiFitScore: true, appliedAt: true,
      candidate: { select: { id: true, fullName: true, email: true } },
      job: { select: { id: true, title: true } },
    },
  });

  this.logger.log(
    `Application ${id} stage ${existing.currentStage} -> ${stage} (company ${companyId})`,
  );
  return updated as ApplicationListItemDto;
}
```

Add the import `import { ApplicationListItemDto } from './dto/application-list-item.dto';` if not already present.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/applications/applications.service.spec.ts -t updateStage`
Expected: PASS (both cases).

- [ ] **Step 6: Wire the controller route**

In `apps/backend/src/applications/applications.controller.ts`:
- Add to the `@nestjs/common` import: `Body`, `Patch`.
- Add imports:
  ```ts
  import { UpdateApplicationStageDto } from './dto/update-application-stage.dto';
  import { ApplicationListItemDto } from './dto/application-list-item.dto';
  ```
- Add the route (after `@Get(':id')` is fine — `:id/stage` is a distinct path):

```ts
@Patch(':id/stage')
@ApiOperation({ summary: 'Move an application to a different pipeline stage' })
@ApiResponse({ status: 200, type: ApplicationListItemDto })
@ApiResponse({ status: 400, description: 'Invalid stage' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Candidate not found' })
updateStage(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateApplicationStageDto,
  @CurrentUser() user: SafeUser,
): Promise<ApplicationListItemDto> {
  return this.applicationsService.updateStage(id, user.companyId, dto.stage);
}
```

- [ ] **Step 7: Verify gate**

Run: `cd apps/backend && npx jest src/applications && npx tsc --noEmit -p tsconfig.json`
Expected: jest all green, tsc exits 0.

---

### Task 3: Frontend — types + pipeline store

**Files:**
- Modify: `apps/frontend/src/types/pipeline.ts` (rewrite for real data)
- Create: `apps/frontend/src/stores/pipeline.store.ts`

**Interfaces:**
- Consumes: backend `GET /applications/board?jobId=`, `PATCH /applications/:id/stage`; existing `useJobsStore().fetchJobs`; `api` + `getApiErrorMessage` from `@/plugins/axios`.
- Produces:
  - Types: `PipelineStage`, `PipelineCard`, `BoardResponse`, `STAGE_LABELS`, `ACTIVE_STAGES`.
  - Store `usePipelineStore()` with `{ board, jobs, selectedJobId, loading, error, fetchPublishedJobs(), fetchBoard(jobId), moveStage(appId, fromStage, toStage) }`.

- [ ] **Step 1: Rewrite the types**

Replace the entire contents of `apps/frontend/src/types/pipeline.ts`:

```ts
/* Pipeline (kanban) view types — wired to GET /applications/board. */

export type PipelineStage =
  | 'APPLIED' | 'SCREENED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED'

export const STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREENED: 'Screened',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
}

/** Stages rendered as kanban columns (REJECTED is the separate lane). */
export const ACTIVE_STAGES: PipelineStage[] = ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED']

export interface PipelineCard {
  id: string
  currentStage: PipelineStage
  aiFitScore: number | null
  appliedAt: string
  candidate: { id: string; fullName: string; email: string }
  job: { id: string; title: string }
}

export interface BoardResponse {
  job: { id: string; title: string }
  stages: Record<PipelineStage, PipelineCard[]>
  counts: Record<PipelineStage, number>
}

export interface JobOption {
  id: string
  title: string
}
```

- [ ] **Step 2: Create the store**

Create `apps/frontend/src/stores/pipeline.store.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import { useJobsStore } from '@/stores/jobs.store'
import type { BoardResponse, JobOption, PipelineCard, PipelineStage } from '@/types/pipeline'

export const usePipelineStore = defineStore('pipeline', () => {
  const board = ref<BoardResponse | null>(null)
  const jobs = ref<JobOption[]>([])
  const selectedJobId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPublishedJobs(): Promise<void> {
    const jobsStore = useJobsStore()
    const res = await jobsStore.fetchJobs({ status: 'PUBLISHED', pageSize: 100 })
    jobs.value = res.data.map((j) => ({ id: j.id, title: j.title }))
    if (!selectedJobId.value && jobs.value.length) {
      selectedJobId.value = jobs.value[0].id
    }
  }

  async function fetchBoard(jobId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<BoardResponse>('/applications/board', { params: { jobId } })
      board.value = data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load the pipeline.')
      board.value = null
      throw e
    } finally {
      loading.value = false
    }
  }

  async function moveStage(
    appId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage,
  ): Promise<void> {
    if (!board.value || fromStage === toStage) return
    const from = board.value.stages[fromStage]
    const idx = from.findIndex((c) => c.id === appId)
    if (idx === -1) return
    const [card] = from.splice(idx, 1)

    // optimistic
    const moved: PipelineCard = { ...card, currentStage: toStage }
    board.value.stages[toStage].unshift(moved)
    board.value.counts[fromStage] -= 1
    board.value.counts[toStage] += 1

    try {
      await api.patch(`/applications/${appId}/stage`, { stage: toStage })
    } catch (e) {
      // revert
      const undoIdx = board.value.stages[toStage].findIndex((c) => c.id === appId)
      if (undoIdx !== -1) board.value.stages[toStage].splice(undoIdx, 1)
      from.splice(idx, 0, card)
      board.value.counts[fromStage] += 1
      board.value.counts[toStage] -= 1
      error.value = getApiErrorMessage(e, 'Failed to move the candidate.')
      throw e
    }
  }

  return { board, jobs, selectedJobId, loading, error, fetchPublishedJobs, fetchBoard, moveStage }
})
```

> Note: confirm `JobListItem` has `id` and `title` (it does — used in JobsTable). If `fetchJobs` query type lacks `pageSize`, omit it (defaults to backend max-ish); `status: 'PUBLISHED'` is the key filter.

- [ ] **Step 3: Verify gate**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exits 0. (If `fetchJobs` rejects `pageSize`, remove it and re-run.)

---

### Task 4: Frontend — vuedraggable dep + kanban card/column rewrite

**Files:**
- Modify: `apps/frontend/package.json` (add dep)
- Modify: `apps/frontend/src/components/pipeline/KanbanCard.vue`
- Modify: `apps/frontend/src/components/pipeline/KanbanColumn.vue`
- Reference: `apps/frontend/src/utils/score.ts` (`scoreLevel`)

**Interfaces:**
- Consumes: `PipelineCard`, `PipelineStage`, `STAGE_LABELS` from `@/types/pipeline`; `usePipelineStore`.
- Produces: `KanbanColumn` emits nothing new — calls `store.moveStage` on drop and emits `card-moved` `{ name, fromStage, toStage, id }` for the toast; `KanbanCard` emits `open` `{ id }` on click.

- [ ] **Step 1: Install vuedraggable**

Run: `cd apps/frontend && npm install vuedraggable@next`
Expected: `vuedraggable` (and `sortablejs`) added to `package.json` dependencies. (Destructive/install — already approved in spec.)

- [ ] **Step 2: Rewrite KanbanCard.vue**

Replace `apps/frontend/src/components/pipeline/KanbanCard.vue`:

```vue
<template>
  <div class="hf-kcard" :class="{ dragging }" @click="$emit('open', card.id)">
    <div class="hf-kcard-top">
      <Avatar :name="card.candidate.fullName" />
      <div style="flex: 1; min-width: 0">
        <div class="hf-kcard-name">{{ card.candidate.fullName }}</div>
        <div class="hf-kcard-role">{{ card.candidate.email }}</div>
      </div>
      <span v-if="card.aiFitScore != null" class="hf-score" :class="scoreLevel(card.aiFitScore)">
        {{ card.aiFitScore }}
      </span>
      <span v-else class="hf-score" style="opacity: 0.5">—</span>
    </div>

    <div class="hf-kcard-foot">
      <HfIcon name="clock" :size="12" />
      <span>{{ relativeAge(card.appliedAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/common/Avatar.vue'
import HfIcon from '@/components/common/HfIcon.vue'
import { scoreLevel } from '@/utils/score'
import { relativeAge } from '@/utils/date'
import type { PipelineCard } from '@/types/pipeline'

defineProps<{ card: PipelineCard; dragging?: boolean }>()
defineEmits<{ open: [id: string] }>()
</script>
```

- [ ] **Step 3: Create the relative-age util (if missing)**

Check first: `ls apps/frontend/src/utils/date.ts`. If it does NOT exist, create `apps/frontend/src/utils/date.ts`:

```ts
/** Compact relative age, e.g. "today", "2d ago", "3w ago". */
export function relativeAge(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const days = Math.floor((now - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
```
If a relative-time helper already exists in `utils/`, import that instead and skip this step.

- [ ] **Step 4: Rewrite KanbanColumn.vue with vuedraggable**

Replace `apps/frontend/src/components/pipeline/KanbanColumn.vue`:

```vue
<template>
  <div class="hf-col" :class="stage.toLowerCase()">
    <div class="hf-col-head">
      <div class="hf-col-name">{{ label }}</div>
      <div class="hf-col-count">{{ cards.length }}</div>
    </div>
    <draggable
      :list="cards"
      group="pipeline"
      item-key="id"
      :animation="150"
      ghost-class="dragging"
      class="hf-col-drop"
      @change="onChange"
    >
      <template #item="{ element }">
        <KanbanCard :card="element" @open="$emit('open', $event)" />
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import KanbanCard from '@/components/pipeline/KanbanCard.vue'
import { STAGE_LABELS } from '@/types/pipeline'
import type { PipelineCard, PipelineStage } from '@/types/pipeline'

const props = defineProps<{ stage: PipelineStage; cards: PipelineCard[] }>()
const emit = defineEmits<{
  open: [id: string]
  moved: [payload: { id: string; name: string; fromStage: PipelineStage; toStage: PipelineStage }]
}>()

const label = computed(() => STAGE_LABELS[props.stage])

interface AddedEvent {
  added?: { element: PipelineCard }
}
function onChange(evt: AddedEvent) {
  // Only the destination column fires `added`; that's where we persist.
  if (!evt.added) return
  const card = evt.added.element
  if (card.currentStage === props.stage) return
  emit('moved', {
    id: card.id,
    name: card.candidate.fullName,
    fromStage: card.currentStage,
    toStage: props.stage,
  })
}
</script>

<style scoped>
.hf-col-drop { display: flex; flex-direction: column; gap: 8px; min-height: 40px; }
</style>
```

> Design note: the per-column `+` add button (`hf-col-add`) is dropped (no manual-add backend). The `dragging` ghost style already exists in `hireflow.css`/scoped styles from the original card.

- [ ] **Step 5: Verify gate**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exits 0. (vuedraggable ships its own types via `@types`/bundled; if vue-tsc complains about missing types, add `// @ts-expect-error vuedraggable has no bundled types` above the import or install `@types/sortablejs` — note in handoff.)

---

### Task 5: Frontend — wire Pipeline.vue (selector, search, sort, rejected lane, toast, loading)

**Files:**
- Modify: `apps/frontend/src/views/Pipeline.vue` (rewrite script + controls)

**Interfaces:**
- Consumes: `usePipelineStore`, `KanbanColumn` (`@open`, `@moved`), `STAGE_LABELS`, `ACTIVE_STAGES`, `PipelineCard`, `PipelineStage`; `useRouter`.
- Produces: the functional screen. No new exports.

- [ ] **Step 1: Rewrite the Pipeline.vue script + template**

Replace `apps/frontend/src/views/Pipeline.vue`. Key behaviors: load published jobs → board on mount; job selector (`v-menu`); client-side search + sort computed per column; rejected lane is a drop target + expandable; undo snackbar; loading skeleton; error state.

```vue
<template>
  <div class="pipeline">
    <!-- Heading + actions -->
    <div class="head-row">
      <div>
        <h1 class="hf-h1">Pipeline</h1>
        <div class="hf-muted" style="margin-top: 4px">
          {{ activeTotal }} candidates in active stages · {{ store.jobs.length }} open jobs
        </div>
      </div>
      <div class="head-actions">
        <AppField v-model="search" class="search-field" placeholder="Search candidates">
          <template #append><HfIcon name="search" :size="15" /></template>
        </AppField>

        <v-menu>
          <template #activator="{ props: menuProps }">
            <AppButton variant="ghost" v-bind="menuProps">
              <HfIcon name="briefcase" :size="14" />{{ selectedJobTitle }}<HfIcon name="chevron" :size="14" />
            </AppButton>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="j in store.jobs"
              :key="j.id"
              :title="j.title"
              :active="j.id === store.selectedJobId"
              @click="selectJob(j.id)"
            />
          </v-list>
        </v-menu>

        <v-menu>
          <template #activator="{ props: menuProps }">
            <AppButton variant="ghost" v-bind="menuProps">{{ sortLabel }}<HfIcon name="chevron" :size="14" /></AppButton>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="opt in sortOptions"
              :key="opt.value"
              :title="opt.label"
              :active="opt.value === sortBy"
              @click="sortBy = opt.value"
            />
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.loading" class="hf-kanban">
      <div v-for="s in ACTIVE_STAGES" :key="s" class="hf-col">
        <div class="hf-col-head"><div class="hf-col-name">{{ STAGE_LABELS[s] }}</div></div>
        <div v-for="n in 3" :key="n" class="skel-card" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="hf-card placeholder">
      <div style="font-weight: 600">{{ store.error }}</div>
      <AppButton variant="ghost" @click="reload">Retry</AppButton>
    </div>

    <!-- Board -->
    <template v-else-if="store.board">
      <div class="hf-kanban">
        <KanbanColumn
          v-for="s in ACTIVE_STAGES"
          :key="s"
          :stage="s"
          :cards="columnCards(s)"
          @open="openCandidate"
          @moved="onMoved"
        />
      </div>

      <!-- Rejected lane -->
      <div class="hf-card rejected-lane">
        <span class="rej-dot" />
        <div style="font-size: 13px; font-weight: 600">Rejected</div>
        <span class="hf-col-count">{{ store.board.counts.REJECTED }}</span>
        <span v-if="rejectedNames" class="hf-muted" style="font-size: 12px">
          Most recent: {{ rejectedNames }}
        </span>
        <AppButton variant="ghost" class="expand-btn" @click="rejectedOpen = !rejectedOpen">
          {{ rejectedOpen ? 'Collapse' : 'Expand' }}<HfIcon name="chevron" :size="14" />
        </AppButton>
      </div>
      <KanbanColumn
        v-if="rejectedOpen"
        stage="REJECTED"
        :cards="columnCards('REJECTED')"
        @open="openCandidate"
        @moved="onMoved"
      />
    </template>

    <!-- Undo toast -->
    <div v-if="toast" class="hf-toast">
      <div class="dot"><HfIcon name="check" :size="12" /></div>
      {{ toast.name }} moved to {{ STAGE_LABELS[toast.toStage] }} ·
      <span style="opacity: 0.6; cursor: pointer" @click="undoMove">Undo</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HfIcon from '@/components/common/HfIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppField from '@/components/common/AppField.vue'
import KanbanColumn from '@/components/pipeline/KanbanColumn.vue'
import { usePipelineStore } from '@/stores/pipeline.store'
import { ACTIVE_STAGES, STAGE_LABELS } from '@/types/pipeline'
import type { PipelineCard, PipelineStage } from '@/types/pipeline'

const router = useRouter()
const store = usePipelineStore()

const search = ref('')
const rejectedOpen = ref(false)

type SortKey = 'score-desc' | 'score-asc' | 'recent' | 'oldest'
const sortBy = ref<SortKey>('score-desc')
const sortOptions: { label: string; value: SortKey }[] = [
  { label: 'AI score (high → low)', value: 'score-desc' },
  { label: 'AI score (low → high)', value: 'score-asc' },
  { label: 'Newest applied', value: 'recent' },
  { label: 'Oldest applied', value: 'oldest' },
]
const sortLabel = computed(() => sortOptions.find((o) => o.value === sortBy.value)!.label)

const selectedJobTitle = computed(
  () => store.jobs.find((j) => j.id === store.selectedJobId)?.title ?? 'Select a job',
)

function matchesSearch(c: PipelineCard): boolean {
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return c.candidate.fullName.toLowerCase().includes(q) || c.candidate.email.toLowerCase().includes(q)
}

function columnCards(stage: PipelineStage): PipelineCard[] {
  if (!store.board) return []
  const list = store.board.stages[stage].filter(matchesSearch)
  const sorted = [...list]
  sorted.sort((a, b) => {
    switch (sortBy.value) {
      case 'score-asc': return (a.aiFitScore ?? -1) - (b.aiFitScore ?? -1)
      case 'recent': return +new Date(b.appliedAt) - +new Date(a.appliedAt)
      case 'oldest': return +new Date(a.appliedAt) - +new Date(b.appliedAt)
      default: return (b.aiFitScore ?? -1) - (a.aiFitScore ?? -1)
    }
  })
  return sorted
}

const activeTotal = computed(() =>
  store.board ? ACTIVE_STAGES.reduce((sum, s) => sum + store.board!.counts[s], 0) : 0,
)
const rejectedNames = computed(() =>
  store.board ? store.board.stages.REJECTED.slice(0, 3).map((c) => c.candidate.fullName).join(', ') : '',
)

// Undo toast state
const toast = ref<{ id: string; name: string; fromStage: PipelineStage; toStage: PipelineStage } | null>(null)

async function onMoved(p: { id: string; name: string; fromStage: PipelineStage; toStage: PipelineStage }) {
  // vuedraggable already mutated the local arrays; sync currentStage + counts + persist.
  await persist(p.id, p.fromStage, p.toStage)
  toast.value = p
}

async function persist(id: string, fromStage: PipelineStage, toStage: PipelineStage) {
  try {
    await store.moveStage(id, fromStage, toStage)
  } catch {
    // store reverts its own state; reload to resync the DOM lists vuedraggable mutated.
    await reload()
  }
}

async function undoMove() {
  if (!toast.value) return
  const t = toast.value
  toast.value = null
  await persist(t.id, t.toStage, t.fromStage)
}

function selectJob(id: string) {
  store.selectedJobId = id
  reload()
}
function reload() {
  if (store.selectedJobId) return store.fetchBoard(store.selectedJobId)
}
function openCandidate(id: string) {
  router.push(`/candidates/${id}`)
}

onMounted(async () => {
  await store.fetchPublishedJobs()
  if (store.selectedJobId) await store.fetchBoard(store.selectedJobId)
})
</script>

<style scoped>
.pipeline { display: flex; flex-direction: column; gap: 16px; }
.head-row { display: flex; align-items: center; gap: 12px; }
.head-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.search-field { width: 240px; }
.search-field :deep(.v-field__input) { min-height: 38px; }
.placeholder { padding: 60px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--hf-text-muted); }
.rejected-lane { padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
.rej-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--hf-danger); }
.expand-btn.v-btn { margin-left: auto; height: 28px; padding: 0 8px; font-size: 12px; }
.skel-card { height: 76px; border-radius: 10px; background: var(--hf-bg); border: 1px solid var(--hf-border); opacity: 0.6; }
</style>
```

> **Move-flow note (important):** vuedraggable mutates `store.board.stages[*]` arrays directly (we bind `:list="cards"` → the column computed returns a filtered/sorted COPY, so vuedraggable mutates the COPY, not the store array). Because `columnCards` returns a new array, vuedraggable's internal move won't touch the store. Therefore `onMoved` is the single source of truth: it calls `store.moveStage` which performs the authoritative splice on the real store arrays + the PATCH. The visual list re-renders from the recomputed `columnCards`. On PATCH failure, `store.moveStage` reverts and we `reload()` to guarantee DOM/store consistency.

- [ ] **Step 2: Verify gate (typecheck)**

Run: `cd apps/frontend && npx vue-tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Manual smoke (deferred to user per convention)**

With backend + frontend running, logged in as a recruiter with a published job that has applications:
- Board loads grouped by stage; counts correct; skeleton shows during fetch.
- Drag a card across columns → it stays, network shows `PATCH /applications/:id/stage` 200, toast appears.
- Undo → card returns, second PATCH fires.
- Search filters cards live; sort reorders; job selector switches boards.
- Click a card → `/candidates/:id`.
- Drag a card onto the expanded Rejected column → rejects it.

---

## Self-Review

**Spec coverage:**
- Per-job board → Task 1 (`getBoard`) + Task 5 (selector). ✓
- Stage PATCH + optimistic/revert → Task 2 + Task 3 (`moveStage`). ✓
- Search / job selector / sort → Task 5. ✓
- Rejected lane (count + expand + drop target) → Task 5. ✓
- Card click → detail → Task 4 (`open` emit) + Task 5 (`openCandidate`). ✓
- Undo toast → Task 5. ✓
- Loading skeleton → Task 5. ✓
- Dropped tags/msgs → Task 4 (card shows email + age). ✓
- vuedraggable dep → Task 4. ✓
- Deferred List/Calendar/Add/Filters/avatars → not implemented (intentional); note: original Pipeline.vue had List/Calendar `SegmentedTabs` — the rewrite in Task 5 drops them entirely (cleaner than dead "Coming soon" tabs). If you want them retained as placeholders, re-add the `SegmentedTabs` block.

**Placeholder scan:** No TBD/TODO; all code blocks complete.

**Type consistency:** `PipelineCard` shape identical across types/store/card/column (`candidate.fullName`, `aiFitScore`, `appliedAt`, `currentStage`). `moveStage(appId, fromStage, toStage)` signature matches store + Pipeline.vue calls. `getBoard`/`updateStage` backend signatures match controller calls.

**Known risk flagged:** vuedraggable + a computed-copy list means the canonical move is done by `store.moveStage`, NOT by vuedraggable's array mutation (documented in the move-flow note). Reviewer should confirm during manual smoke that cards don't duplicate/vanish; if vuedraggable's mutation of the copy causes a flicker, switch the column to bind the real store array and let vuedraggable do the move (then `moveStage` only patches + fixes counts).
