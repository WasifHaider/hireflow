# Recruiter Dashboard — Backend Integration Design

**Date:** 2026-06-19
**Status:** Approved (pending spec review)
**Scope:** Replace mock data in `Dashboard.vue` (recruiter) with real backend endpoints. Read-only this pass — no stage-change mutations.

## Context

The recruiter dashboard (`apps/frontend/src/views/Dashboard.vue`) is pixel-matched to the design mockup but every widget renders hardcoded mock data, except the greeting name + company which already derive from `authStore` (`GET /auth/me`).

The data model already supports almost everything:
- `Application.currentStage` (enum `APPLIED|SCREENED|INTERVIEW|OFFER|HIRED|REJECTED`, default `APPLIED`) with index `[companyId, currentStage]`.
- `Application.aiFitScore` (Int?), `appliedAt`, `updatedAt`.
- `Job.status` (`DRAFT|PUBLISHED|CLOSED`), `deletedAt` soft-delete.

No schema change required for this pass.

Existing endpoints: `GET /jobs` (paginated), `GET /applications/:id/resume-url`, `GET /auth/me`. There is no recruiter-facing endpoint to list applications or aggregate dashboard stats — that is the gap this design closes.

## Decisions (from brainstorming)

- **API shape:** Hybrid — one aggregate `GET /dashboard/summary` for dashboard-only widgets, plus a reusable paginated `GET /applications` list (needed later by candidates/pipeline screens).
- **AI suggestions widget:** keep the card, render a "Coming soon" empty state (no fake data, no ML yet).
- **Time-to-hire stat:** dropped (no real hire timestamp). 4th stat card relabeled **Awaiting review**.
- **/auth/me:** confirm it hydrates greeting + workspace + avatar on dashboard mount/refresh, not only post-signin.

## Endpoints & Contracts

### A) `GET /applications` (NEW) — reusable paginated list

- Guard: `RecruiterAuthGuard`. Tenant-scoped by `companyId` derived from JWT (never from request).
- Query params (validated DTO, whitelist + forbidNonWhitelisted):
  - `page` (default 1), `limit` (default 20, max 100)
  - `jobId?` — filter to one job
  - `stage?` — `ApplicationStage` filter
  - `sort?` — `appliedAt` | `aiFitScore` (default `appliedAt`)
  - `order?` — `asc` | `desc` (default `desc`)
- Returns `{ items, total, page, limit }`.
- Each item (explicit select — no sensitive/heavy fields):
  ```
  {
    id,
    candidate: { fullName, email },
    job: { id, title },
    currentStage,
    aiFitScore,
    appliedAt
  }
  ```
- Excluded from list payload: `resumeText`, `resumeUrl`, `aiScoreDetails`, `coverLetter`, `passwordHash`. Resume access stays behind the existing `GET /applications/:id/resume-url`.
- Recent-applications widget calls `?limit=6&sort=appliedAt&order=desc`.

### B) `GET /dashboard/summary` (NEW) — dashboard-only aggregate

- Guard: `RecruiterAuthGuard`. Tenant-scoped by `companyId` from JWT.
- Returns:
  ```
  {
    stats: {
      activeJobs,         // jobs status=PUBLISHED, deletedAt=null
      totalApplications,  // count applications for company
      avgAiScore,         // avg aiFitScore where not null, rounded int (0 if none)
      awaitingReview      // count applications currentStage=APPLIED
    },
    pipeline: { APPLIED, SCREENED, INTERVIEW, OFFER, HIRED, REJECTED },
    applicationsPerDay: [ { date, count } ]   // last 7 calendar days, zero-filled
  }
  ```
- `pipeline` from `groupBy currentStage` (uses existing `[companyId, currentStage]` index). Frontend funnel renders the 5 forward stages; `REJECTED` returned but rendered separately or omitted.
- `applicationsPerDay` via one `$queryRaw` (`date_trunc('day', applied_at)` filtered to company + last 7 days), zero-filled in JS so missing days show count 0.

## Backend Structure

- **Applications list:** extend existing `ApplicationsController` / `ApplicationsService` with `findAll(companyId, query)`. Keeps all application logic co-located. New `ListApplicationsQueryDto`. New response DTO for list items.
- **Dashboard:** new `dashboard/` module — `DashboardController` + `DashboardService.getSummary(companyId)`. Aggregation logic isolated here, not smeared into jobs/applications services. New `DashboardSummaryResponseDto`.
- All reads use Prisma `count` / `aggregate` / `groupBy` (one round-trip each) — no N+1. `applicationsPerDay` is the single raw query.
- Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) on every endpoint. Proper TS types, no `any`.

## Frontend Wiring

- New `apps/frontend/src/stores/dashboard.store.ts` (Pinia): holds `summary` + `recentApplications`, `loading`/`error` state, action `load()` calling both endpoints (parallel).
- `Dashboard.vue`: replace the 11 mock blocks with store data on mount.
  - 4 stat cards → `summary.stats` (4th card relabeled **Awaiting review**).
  - Recent applications table → `recentApplications` (`GET /applications?limit=6`).
  - Pipeline overview → `summary.pipeline`.
  - Applications chart → `summary.applicationsPerDay`.
  - AI suggestions card → "Coming soon" empty state.
- Loading skeletons on cards/table while fetching; empty states ("No applications yet") when zero data.
- Greeting + workspace + avatar confirmed driven by `authStore` / `GET /auth/me`, hydrated on mount/refresh (wire hydration if missing).
- Typecheck must pass: `npx vue-tsc --noEmit -p tsconfig.app.json` (run from `apps/frontend`).

## Out of Scope (this pass)

- Stage-change / candidate-move mutations (recruiter cannot move candidates through pipeline yet — separate feature).
- Real AI suggestions / recommendation engine.
- Accurate time-to-hire (would need `hiredAt` timestamp + stage-transition logic).
- Candidates list / pipeline / analytics full screens (the `GET /applications` endpoint is built reusable for them, but those screens are separate work).

## Testing

- Backend: verify tenant isolation (company A cannot see company B's applications/stats — cross-tenant returns empty/own-only), pagination bounds, stage/job filters, empty-company returns zeroed summary.
- Frontend: typecheck green; dashboard renders real data, loading and empty states behave.
