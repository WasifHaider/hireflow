# Pipeline (Kanban) — Functional + Backend Integration

**Date:** 2026-06-21
**Branch:** (working-tree; user handles git)
**Screen:** `/pipeline` — recruiter kanban board
**Status:** design approved, ready for plan

## Goal

The pipeline screen (`apps/frontend/src/views/Pipeline.vue` + `components/pipeline/`) currently renders a hard-coded mock board. Make it fully functional and wired to real backend data: a per-job kanban where recruiters see applications grouped by stage, drag cards between stages to advance/reject candidates, search, switch jobs, sort, and click into candidate detail.

## Scope

### In scope
- **Per-job board.** A job selector drives which job's applications the board shows. Cards grouped by the six `ApplicationStage` values.
- **Drag-and-drop** cards between columns (incl. into/out of the Rejected lane) → persists the stage change to the backend (optimistic, with revert + error on failure).
- **Search** — filter visible cards by candidate name/email (client-side over the loaded board).
- **Job selector** — real dropdown of the company's PUBLISHED jobs; switching refetches the board.
- **Sort** — AI score (high→low / low→high) and recency (newest/oldest applied), client-side.
- **Rejected lane** — real REJECTED count; Expand reveals rejected cards; also a drop target (drag-to-reject).
- **Card click → `/candidates/:id`** (detail screen already built).
- **Undo toast** — after a move, a snackbar "{name} moved to {stage} · Undo"; Undo reverses the move via the same endpoint.
- **Loading state** — skeleton columns while the board fetch is in flight (project rule: every fetch shows a loading state).

### Deferred / dropped (no backend data)
- **Add candidate** button + per-column `+` — no manual-add flow exists.
- **Filters** button (the "2" badge) — no extra filter dimensions wired here.
- **"Showing +10" avatar stack** — cosmetic; left static or removed.
- **List / Calendar view tabs** — stay as the existing "Coming soon" placeholders.
- **Card `tags` and `N msgs`** — no candidate-skills column and no messages table. Replaced on the card by candidate **email** (subline) + **relative applied age** (footer).

## Backend changes (`apps/backend/src/applications/`)

Reuses existing tenant-isolation, DTO, and service patterns. No schema/migration changes (the `ApplicationStage` enum and `currentStage` column already exist).

### A) `GET /applications/board?jobId=<uuid>` — grouped board data

New service method `getBoard(jobId, companyId)` + controller route.

- **Tenant + existence check first:** `prisma.job.findFirst({ where: { id: jobId, companyId } })`. If null → `404` (enumeration defense — never 403).
- Fetch **all** applications for that job (no pagination — a kanban needs every card), same `select` as the list-item query (`id, currentStage, aiFitScore, appliedAt, candidate{id,fullName,email}, job{id,title}`), ordered by `aiFitScore desc` as a sensible default.
- Group into all six stages, **zero-filled** (every stage key present even if empty), plus a `counts` map.
- `jobId` is validated by `ParseUUIDPipe`.

Response DTO (`dto/application-board.dto.ts`):
```
{
  job: { id, title },
  stages: { APPLIED: Item[], SCREENED: [], INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [] },
  counts: { APPLIED: n, SCREENED: n, INTERVIEW: n, OFFER: n, HIRED: n, REJECTED: n }
}
```
where `Item` = the existing `ApplicationListItemDto` shape.

**Route ordering:** declare `board` and `facets` **before** the `:id` route (already the convention in this controller) so the literal path isn't swallowed by the UUID param route.

### B) `PATCH /applications/:id/stage` — move a card

New service method `updateStage(id, companyId, stage)` + controller route + body DTO.

- Body DTO (`dto/update-application-stage.dto.ts`): `{ stage: ApplicationStage }` validated with `@IsEnum(ApplicationStage)`; DTO whitelist + forbidNonWhitelisted (existing global pipe) rejects extra fields. Invalid/missing enum → `400`.
- `prisma.application.findFirst({ where: { id, companyId } })` → if null `404` ("Candidate not found", matching `findOne`).
- `prisma.application.update` setting `currentStage`. Idempotent: same stage still returns `200` (no special-casing needed).
- **Log** the transition (`from → to`) via the Nest `Logger` (state-change logging rule).
- Returns the updated item in list-item shape (so the store can reconcile).
- Swagger: `@ApiOperation`, `@ApiResponse` 200/400/401/404.

### Tests (Jest, mocked Prisma — matches existing `applications.service.spec.ts`)
- `getBoard`: returns zero-filled stages; cross-tenant job → 404.
- `updateStage`: valid move updates + returns; cross-tenant id → 404; (enum validation is DTO-level, covered by pipe).

## Frontend changes (`apps/frontend/src/`)

### `types/pipeline.ts` (rewrite)
- Keep `PipelineStage` as the enum union `'APPLIED'|'SCREENED'|'INTERVIEW'|'OFFER'|'HIRED'|'REJECTED'`.
- `PipelineCard` = `{ id, name, email, score: number|null, currentStage, appliedAt: string }`.
- `BoardResponse` = `{ job:{id,title}, stages: Record<Stage, PipelineCard[]>, counts: Record<Stage, number> }`.
- Stage label map (`APPLIED→'Applied'`, etc.) for display; the five **active** stages render as columns, `REJECTED` is the lane.

### `stores/pipeline.store.ts` (new, Pinia)
- State: `board` (grouped), `jobs` (published-job options), `selectedJobId`, `loading`, `error`.
- `fetchPublishedJobs()` — load the company's PUBLISHED jobs for the selector (reuse the jobs API with a status filter; fall back to `/applications/facets` jobs list if simpler). Default `selectedJobId` to the first job.
- `fetchBoard(jobId)` — `GET /applications/board`, set `board`, manage `loading`/`error`.
- `moveStage(appId, fromStage, toStage)` — **optimistic**: splice the card from `fromStage` into `toStage` in local state immediately, then `PATCH /applications/:id/stage`. On failure: revert the splice and surface an error (snackbar). Returns enough info for Undo.

### `Pipeline.vue` (rewrite the script + wire controls)
- On mount: `fetchPublishedJobs()` → `fetchBoard(selectedJobId)`.
- Job selector button → dropdown (Vuetify `v-menu` + list, or `AppField` select styled to match) of published jobs → on change set `selectedJobId` + refetch.
- Search `v-model` → client-side filter of cards by name/email (computed over `board.stages`).
- Sort dropdown → client-side ordering applied in the column computed (AI score desc/asc, applied newest/oldest).
- Heading count = sum of the five active-stage counts; "across N open jobs" = published-job count.
- Loading → skeleton columns. Empty job (0 apps) → empty board (all columns show 0), not an error.
- Card click → `router.push('/candidates/' + id)`.

### `components/pipeline/KanbanColumn.vue`
- Wrap the card list in `<draggable>` (vuedraggable), shared `group="pipeline"`, `item-key="id"`, animation enabled.
- On `@change` (add event) → call `store.moveStage(card.id, fromStage, this.stage)` and trigger the undo toast.
- Drop `draggedName` mock prop; dragging visual handled by vuedraggable ghost/chosen classes mapped to the existing `.dragging` style.

### `components/pipeline/KanbanCard.vue`
- Props: real `PipelineCard`. Show avatar + name + **email** subline + score badge (`scoreLevel` util; handle `null` score → neutral/"—") + footer **relative applied age** (e.g. "2d ago" via a small date util). Remove `tags` and `msgs` blocks.

### Rejected lane (in `Pipeline.vue`)
- Real `counts.REJECTED`; "Most recent: …" from the first few REJECTED cards. Expand toggles a collapsed list of rejected cards; the lane is a vuedraggable drop target (`group="pipeline"`) so dragging a card here rejects it.

### Undo toast
- After a successful move, show snackbar with the moved name + target label + Undo. Undo calls `moveStage(id, toStage, fromStage)` (reverse) and dismisses.

### New dependency
- **`vuedraggable@next`** (Vue 3 wrapper over SortableJS, ~10kb). Rationale: Vuetify has no kanban/DnD primitive; native HTML5 drag is janky, has no touch support, and needs hand-rolled drop indicators. Standard choice for Vue kanban.

## Data flow

```
mount → fetchPublishedJobs → selectedJobId
      → fetchBoard(jobId) ──GET /applications/board──> grouped state
column render = board.stages[stage] |> searchFilter |> sortOrder
drag card A→B → optimistic splice → PATCH /applications/:id/stage
      ├─ ok  → toast(Undo)
      └─ err → revert splice + error snackbar
card click → /candidates/:id
```

## Error handling
- Board fetch failure → error state in the board area (retryable), not a crash.
- Stage PATCH failure → revert optimistic move + error snackbar; board stays consistent.
- 404 on board (job not yours / deleted) → treated as "no such job", select another / empty state.

## Verification
- Backend: `npx jest` (applications spec green incl. new board/updateStage cases).
- Frontend: `npx vue-tsc --noEmit -p tsconfig.app.json` exit 0.
- Manual e2e (logged-in recruiter): load board, drag across stages (incl. reject), undo, search, switch jobs, sort, click into detail. (Deferred to user per existing convention.)
