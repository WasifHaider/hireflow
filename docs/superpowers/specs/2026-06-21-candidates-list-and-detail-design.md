# Candidates List + Candidate Detail — Design

**Date:** 2026-06-21
**Branch:** feat/recruiter-dashboard-integration
**Status:** Spec — awaiting user review

## Goal

Build two recruiter-facing, **read-only**, backend-driven screens from the design prototype:

1. **Candidates List** (`candidates_list.jsx`, "25 Candidates List") — global view of every candidate (application) across all jobs in the company, with filters, search, sort, pagination.
2. **Candidate Detail** (adapted from `candidate.jsx`, "03 Candidate Detail") — a **full-screen** page (NOT the mockup's slide-over) showing one candidate's profile. Reached by clicking a row/name in the list.

Both screens are **view-only**: no bulk actions, no write/mutation buttons. The recruiter can see the candidates they have and drill into details. Nothing else.

## Non-negotiable constraints (from user)

- Data source is the **real backend** (no mock data).
- Clicking a candidate row/name opens a **full-screen** detail page, not a slide-over.
- **No action buttons** anywhere (no Move stage / Schedule / Email / Reject / Message / Add tag / Export / Import / Add candidate / Ask AI).
- Vuetify-first + reuse existing shared wrappers so components stay consistent project-wide (`v-btn` via `AppButton` everywhere, etc.). No hand-rolled `<button>`/`<input>`.
- Do NOT commit or merge — user handles git.

## Data reality (what the DB actually backs)

The Prisma model is the source of truth. Mockup fields without a backing column are **dropped**, not faked.

`Application`: `currentStage` (enum APPLIED/SCREENED/INTERVIEW/OFFER/HIRED/REJECTED), `aiFitScore` (Int?), `aiScoreDetails` (Json — only `{model, rawScore, scoredAt}` OR `{reason}`), `coverLetter`, `resumeUrl/Text/Filename/MimeType/SizeBytes`, `appliedAt`, `updatedAt`.
`Candidate`: `email`, `fullName`, `phone`, `linkedinUrl`.
`Job`: `title`, `department`, `location`, etc.

### Candidates List — KEEP (backed)
- Candidate avatar (initials from `fullName`), `fullName`, `email`
- Applying for: `job.title` + "Applied {appliedAt}"
- AI fit: `aiFitScore` (render "—" when null / not scored yet)
- Stage badge: `currentStage`
- Filter sidebar (sticky, left, 240px): **Stage**, **Job**, **AI-fit range** — each a checkbox group with facet counts
- Search by name/email; sort by AI fit or applied date; server-side pagination

### Candidates List — DROP (no backing column → not faked)
- `Source` column + Source filter (no source field)
- Candidate `Location` / `exp` sub-row + Location filter (Candidate has no location/experience)
- `starred` flag
- Rich "Latest activity" log (no activity/event table)
- Bulk-select + bulk action bar (read-only)
- Export / Import CSV / Add candidate / Ask AI / layout-toggle (write/AI actions)

### Candidate Detail — KEEP (backed)
- Identity: avatar, `fullName`, `email`, `phone`, `linkedinUrl`
- Applying-for context: `job.title`, `appliedAt`, `currentStage`
- AI-fit ring: `aiFitScore` + small "scored by {model}" note from `aiScoreDetails`
- Resume: `resumeText` preview + Download button (existing signed-URL endpoint)
- Minimal honest timeline: "Applied {appliedAt}" → "Current stage: {currentStage}"

### Candidate Detail — DROP
- 4-dimension breakdown bars + AI summary paragraph (NOT in `aiScoreDetails` — would be fabricated)
- Action buttons (Move / Schedule / Email / Reject)
- Tabs (Activity / Notes / Emails) + note-input (no backing tables; read-only)

## Backend changes (NestJS, all RecruiterAuthGuard, all tenant-scoped by companyId)

### 1. Extend `GET /applications` (findAll)
- New query params on `ListApplicationsQueryDto`:
  - `q?: string` — case-insensitive contains on `candidate.fullName` OR `candidate.email`
  - `scoreMin?: number` (0–100), `scoreMax?: number` (0–100) — range on `aiFitScore`
- `where` AND-combines existing `jobId`/`stage` with the new filters (tenant `companyId` always present).
- Extend `select` to include `candidate.id` and `job.id` (job.id already present) for row linking.
- Existing sort (`appliedAt`/`aiFitScore`) and pagination unchanged.

### 2. New `GET /applications/facets`
- Returns counts for each filter dimension so sidebar counts stay correct.
- `baseWhere` = `{ companyId }` + active filters EXCEPT the dimension being counted (so each dimension's counts reflect the other active filters — same pattern as jobs facets).
- Shape:
  ```
  {
    stages:   { APPLIED: n, SCREENED: n, INTERVIEW: n, OFFER: n, HIRED: n, REJECTED: n },   // zero-filled
    jobs:     [{ id, title, count }],                                                        // groupBy jobId, joined to titles
    aiFitRanges: { "90-100": n, "80-89": n, "70-79": n, "below-70": n, "unscored": n }
  }
  ```
- Stage counts via `groupBy(['currentStage'])`; job counts via `groupBy(['jobId'])` + a title lookup; AI-fit ranges via counts over score buckets (a small set of `count` calls or a raw bucketed query — implementer's choice, zero-filled).
- Declared in the controller BEFORE the `:id` route so "facets" isn't swallowed by a UUID param pipe (same gotcha handled in jobs).

### 3. New `GET /applications/:id`
- `findFirst({ where: { id, companyId } })` → 404 if not found (cross-tenant enumeration defense).
- Returns one detail object via explicit `select`:
  - application: `id`, `currentStage`, `aiFitScore`, `aiScoreDetails`, `appliedAt`, `updatedAt`, `resumeText`, `resumeFilename`
  - candidate: `id`, `fullName`, `email`, `phone`, `linkedinUrl`
  - job: `id`, `title`
- Does NOT leak anything beyond what a recruiter should see (resumeText is intentionally included — recruiter needs it; passwordHash etc. never selected).
- Resume **download** reuses the existing `GET .../resume-url` signed-URL endpoint (no new download route).

DTOs: extend `ListApplicationsQueryDto`; add `ApplicationFacetsResponseDto`, `ApplicationDetailResponseDto`, `application-detail` select types. Swagger decorators on all. Jest unit tests (mocked Prisma) for findAll filters, facets zero-fill, and detail 404.

## Frontend (Vue 3 + Vuetify, modular, reuse shared components)

### Store
- `stores/candidates.store.ts` — actions: `fetchCandidates(query)`, `fetchFacets(query)`, `fetchCandidate(id)`, `fetchResumeUrl(id)`. Types: `CandidateListItem`, `CandidateListResponse`, `CandidateFacets`, `CandidateDetail`, `CandidateListQuery`.

### Candidates List
- `views/CandidatesList.vue` — container: filter/search/sort/page state (search debounced 300ms like JobsList), orchestrates store, loading skeletons.
- `components/candidates/CandidatesFilterSidebar.vue` — sticky left sidebar, Stage/Job/AI-fit checkbox groups (Vuetify `v-checkbox` or `AppCheckbox`) with facet counts; emits filter changes.
- `components/candidates/CandidatesTable.vue` — wraps `AppDataTable`; columns Candidate / Applying for / AI fit / Stage; row click → `/candidates/:id`. Reuses `AppPagination`.
- Reuse `JobStatusPill`-style stage pill (new small `CandidateStagePill.vue` mapping the 6 stages to colors, or reuse existing pill pattern).

### Candidate Detail
- `views/CandidateDetail.vue` — full-screen page inside RecruiterLayout; loads via `fetchCandidate(route.params.id)`; loading skeleton; 404 → not-found state.
- `components/candidates/CandidateFitRing.vue` — the AI-fit ring (port `hf-ring` CSS), shows `aiFitScore` + "scored by {model}".
- `components/candidates/CandidateResumePanel.vue` — resume text preview + Download button (calls `fetchResumeUrl`, opens signed URL).
- `components/candidates/CandidateTimeline.vue` — minimal 2-item timeline (Applied → current stage).

### Routing & nav
- Add child routes inside the existing RecruiterLayout parent: `/candidates` → `CandidatesList`, `/candidates/:id` (props:true) → `CandidateDetail`.
- Add "Candidates" entry to the RecruiterLayout sidebar nav (`v-list-item` + HfIcon).

### Component consistency (this build)
- Buttons → `AppButton` (wraps `v-btn`). Checkboxes → `AppCheckbox`/`v-checkbox`. Table → `AppDataTable`. Pagination → `AppPagination`. Inputs → `AppField` / `v-text-field`. Icons → `HfIcon`. No raw `<button>`/`<input>`.
- A project-wide consistency audit (sweep every existing view for stray raw elements) is explicitly OUT of scope here — separate follow-up pass.

## Error handling & states
- Every fetch shows a loading state (skeleton rows / skeleton detail) — project rule.
- Empty list → empty-state message.
- Detail 404 / unscored application → graceful ("—" for score, no resume → "No resume on file").
- Backend errors surfaced via snackbar (consistent with JobsList).

## Testing
- Backend: Jest unit tests (mocked Prisma) — findAll new filters, facets zero-fill + base-where exclusion, detail tenant 404.
- Both typechecks green (`vue-tsc` frontend; `tsc`/build backend).
- Manual e2e (logged-in recruiter click-through) deferred to user, consistent with prior screens.

## Out of scope / deferred
- Any write action (stage change, messaging, tagging, reject, export/import, add candidate).
- AI-fit dimension breakdown / AI summary (no backing data).
- Activity log, notes, emails tabs (no backing tables).
- Pipeline kanban screen (Candidate Detail is reached as a standalone route, not over the pipeline).
- Project-wide Vuetify component-consistency audit.
- Source / candidate-location / experience / starred (no backing columns).
- Git commit/merge (user handles).
