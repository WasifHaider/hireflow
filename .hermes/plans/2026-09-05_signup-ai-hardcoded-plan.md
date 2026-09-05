# HireFlow — Signup AI Features, Groq Migration, Hardcoded Fixes

Target repo: D:\Personal\hireflow
Created: 2026-09-05

## Context

Follow-on from the CompanySignUp industry-DTO bug fix. User flagged, in one batch:
1. Post-signup "Setup workspace" page has AI-labeled UI (job-description drafting) that
   does nothing — no backend behind it.
2. Dashboard "AI suggestions" card is a static "Coming soon" placeholder.
3. Resume/JD scoring (ml-service) currently calls OpenAI directly — migrate to Groq,
   remove OpenAI key entirely.
4. Various hardcoded frontend fallback values need fixing (Welcome.vue fallbacks:
   'Acme Inc.', 'acme', 'jamie@acme.com').
5. User additionally approved scoping in: full "AI drafts description" real feature
   (new Groq-backed generation endpoint), Dashboard AI-suggestions wiring, and
   Analytics screen wired to real data.
6. User declined live e2e verification of the Groq swap — code review + typecheck only.

## Existing facts verified before planning

- ml-service (`apps/ml-service/main.py`) uses `openai` Python SDK, model
  `text-embedding-3-small`, cosine similarity, no stored vectors compared across
  requests (job_embedding column in Prisma schema — `Job.jobEmbedding
  Unsupported("vector(1536)")` — exists but is NEVER referenced anywhere in
  `apps/backend/src` grep confirmed 0 hits; it's dead schema, not wired to anything.
  Leave it alone — out of scope).
- Groq's OpenAI-compatible embeddings endpoint (`https://api.groq.com/openai/v1`)
  only supports `nomic-embed-text-v1.5` (768-dim), not text-embedding-3-small.
  Since we don't persist/compare vectors cross-request (fresh embed + cosine every
  call), model swap is safe with no migration.
- Groq chat completions (`/openai/v1/chat/completions`) via same OpenAI-compatible
  base_url supports models like `llama-3.3-70b-versatile` — usable for the new
  JD-generation feature and for dashboard AI-suggestion text generation.
- `Company` model already has `slug`, `logoUrl`, `brandColor` columns — no
  migration needed for Step-1 workspace-basics wiring, just a new PATCH endpoint.
- No company-update endpoint exists yet (`auth.controller.ts` only has
  company/signup, signin, GET /me).
- `CreateJobDto`/`JobsService.create` already fully support all fields Welcome.vue
  Step 2 needs (title, description, requirements, department, location, jobType,
  employmentType, salary, skills, status) — reuse as-is, no schema change.
- Dashboard summary data (`dashboard.service.ts`) already computes stats/pipeline/
  applicationsPerDay — enough raw material to feed a suggestions generator.
- Analytics.vue is 100% mock (`kpis`, `topJobs` hardcoded arrays; `FunnelChart`,
  `ScoreHistogram`, `TimeInStage`, `SourceDonut` components — need to check their
  internal data sourcing before Phase 6).

## Phase 1 — Groq migration in ml-service (small)

Objective: Replace OpenAI embeddings call with Groq's OpenAI-compatible endpoint;
remove OpenAI key entirely from the codebase.

Files touched:
- `apps/ml-service/main.py` — `OpenAI(api_key=..., base_url="https://api.groq.com/openai/v1")`,
  `EMBEDDING_MODEL = "nomic-embed-text-v1.5"`, env var read renamed
  `GROQ_API_KEY` instead of `OPENAI_API_KEY`, log messages updated.
- `apps/ml-service/.env` — set `GROQ_API_KEY=<value provided by user>`, remove
  `OPENAI_API_KEY` line entirely (gitignored file, not committed).
- `apps/ml-service/.env.example` — `GROQ_API_KEY=`.
- `apps/backend/.env.example` — remove the dead `OPENAI_API_KEY` line (backend
  itself never called OpenAI directly).
- `apps/ml-service/requirements.txt` — `openai` SDK stays (it's the HTTP client,
  works fine against Groq's compatible endpoint) — no dependency change needed.

Acceptance: `python -c "import ast; ast.parse(open('main.py').read())"` (or just
read-through), no leftover `OPENAI_API_KEY` references anywhere in tracked files
(`grep -r OPENAI_API_KEY apps/ --include=*.py --include=*.ts --include=*.example`
returns nothing). Per user: no live /score smoke test this round.

## Phase 2 — Fix hardcoded Welcome.vue fallbacks (small)

Objective: Replace literal fallback strings with real signed-up data; if data is
legitimately absent, fall back to something derived (not a fake person's name).

Files touched: `apps/frontend/src/views/Welcome.vue`
- `userEmail` fallback `'jamie@acme.com'` → drop the fallback, show empty/omit
  the line if no email (shouldn't happen post-auth anyway since this route
  requires auth).
- `companyName` fallback `'Acme Inc.'` → derive from `authStore.companyName`
  only; if empty show a generic neutral default like `'your company'` (no fake
  brand name).
- `workspaceSlug` hardcoded `'acme'` → derive from `authStore.company?.slug`
  (already returned by signup response).

Acceptance: `vue-tsc --noEmit` clean; manual code read confirms no literal
placeholder personal/company names remain.

## Phase 3 — Backend: persist workspace basics (small-medium)

Objective: Wire Welcome.vue Step 1 ("Your workspace") to a real PATCH endpoint
so company name / slug edits during setup actually save.

Files touched:
- `apps/backend/src/auth/dto/update-company.dto.ts` (new) — optional
  companyName (maps to `name`), slug (same validation as signup: lowercase,
  hyphens, @Matches).
- `apps/backend/src/auth/auth.controller.ts` — `PATCH /auth/company` (or a new
  `src/companies/` module if that's a cleaner home — decide during
  implementation based on existing module boundaries), RecruiterAuthGuard,
  updates `company.name`/`company.slug`, re-checks slug uniqueness (409 on
  collision, reuse existing `isUniqueConstraintOn` pattern from auth.service).
- `apps/frontend/src/stores/auth.store.ts` — new `updateCompany()` action,
  updates local `company` ref on success.
- `apps/frontend/src/views/Welcome.vue` — call it from a new "Save" affordance
  or on step transition (design has no explicit save button for step 1 today —
  simplest: save on `publishJob()`/`skipToDashboard()` if the fields changed
  from their initial hydrated values).

Acceptance: new backend unit test (dto validation + slug-collision 409 path,
mirroring existing auth.service.spec conventions if one exists, else jobs
service spec style). Both typechecks clean.

## Phase 4 — Backend: AI job-description generation endpoint (medium)

Objective: New Groq-backed endpoint that takes a job title (+ optional
department/location) and returns a generated description + requirements
(+ suggested must-have skills), used by Welcome.vue Step 2's "AI drafts the
description" claim.

Files touched:
- `apps/backend/src/ai/` (new module) — `AiService` wrapping Groq chat
  completions via `@nestjs/axios` HttpService (mirrors `MlScoringClient`
  pattern already in the codebase) or the `groq-sdk` npm package (check
  license/size before adding a new dependency — prefer raw HTTP via axios,
  consistent with existing `MlScoringClient`, to avoid a new dependency for a
  single endpoint).
- `POST /ai/generate-job-description` — `GenerateJobDescriptionDto` {title,
  department?, location?}, RecruiterAuthGuard, calls Groq chat completions
  with a structured prompt asking for JSON {description, requirements,
  mustHaveSkills[]}, parses/validates the JSON response, 502 on upstream
  failure (mirrors ml-service's error-mapping convention), rate-limited
  (reuse @nestjs/throttler per project convention for external-service-backed
  endpoints).
- `GROQ_API_KEY` env var added to `apps/backend/.env` / `.env.example` (backend
  needs its own copy for chat completions — separate concern from ml-service's
  embedding key, same value is fine since it's one Groq account).
- `apps/frontend/src/stores/jobs.store.ts` (or new ai store) — `generateJobDescription()`.
- `apps/frontend/src/views/Welcome.vue` — Step 2: replace `writeOwn()`/
  `publishJob()` stubs. `publishJob()` calls the existing `POST /jobs` (already
  fully built per CLAUDE.md) with the generated or hand-written fields, then
  navigates to `/dashboard`. Add a real "Generate" trigger tied to the AI hint
  button, loading/error states (project rule: every fetch has a loading state).

Acceptance: backend unit test for AiService (mock HttpService, JSON-parse
happy path + malformed-response error path) + controller guard test. Frontend
typecheck clean. No live Groq call (per user: no live verification this round)
— code-reviewed only.

## Phase 5 — Dashboard "AI suggestions" wiring (medium)

Objective: Replace the static "Coming soon" card with real Groq-generated
suggestions derived from the recruiter's actual dashboard summary data.

Files touched:
- `apps/backend/src/dashboard/dashboard.service.ts` — reuse existing
  `getSummary()` output (stats/pipeline/applicationsPerDay) as generation
  input; new `getSuggestions(companyId)` method calls `AiService` (from Phase 4)
  with a prompt summarizing the numbers, asks for 2-3 short actionable
  suggestions as a JSON string array.
- `apps/backend/src/dashboard/dashboard.controller.ts` — `GET
  /dashboard/suggestions` (separate from `/dashboard/summary` so a slow/failed
  LLM call never blocks the main stats), RecruiterAuthGuard.
- `apps/frontend/src/stores/dashboard.store.ts` — `fetchSuggestions()`,
  independent loading/error state from the main summary fetch.
- `apps/frontend/src/views/Dashboard.vue` — replace the "Coming soon" block
  with the fetched list, loading skeleton, and a graceful fallback (if the
  LLM/network call fails, quietly keep showing "Coming soon" rather than an
  error — this card is non-critical, shouldn't ever block the dashboard).

Acceptance: backend unit test (mock AiService, verify prompt shape not
brittle-asserted, verify JSON-parse fallback on bad output). Frontend
typecheck clean.

## Phase 6 — Analytics screen wired to real data (large)

Objective: Replace Analytics.vue's fully-mock `kpis`/`topJobs` arrays and the
4 chart components' internal mock data with real company-scoped queries.

Files touched (scope to firm up once Phase 1-5 land, since this is the
largest phase):
- Need to inspect `FunnelChart.vue`/`ScoreHistogram.vue`/`TimeInStage.vue`/
  `SourceDonut.vue` internals first (not yet read) to know if they accept
  props or own their mock data internally.
- Likely new `apps/backend/src/dashboard/` (or new `src/analytics/` module)
  endpoint(s): funnel counts per stage, AI-score histogram buckets, avg
  time-in-stage per stage transition (needs stage-change timestamps — check
  if `Application` model tracks stage-transition history at all; if not,
  time-in-stage may only be approximable from `updatedAt`, flag this
  limitation rather than fabricating numbers).
- "Sources" donut has NO backing field anywhere in the schema (no
  `application.source` column) — flag as out-of-scope/needs-a-migration
  decision before building, don't fake it.
- Frontend: `apps/frontend/src/stores/analytics.store.ts` (new), wire
  `Analytics.vue` + the 4 chart components to real fetched data, loading/empty
  states.

Acceptance: TBD once sub-scope is firmed up during Phase 6 kickoff — will
re-confirm with user before building given schema gaps found (source, and
possibly time-in-stage).

## Phase Status

- Phase 1: done — ml-service migrated to Groq (nomic-embed-text-v1.5),
  OPENAI_API_KEY removed everywhere (ml-service + backend .env/.env.example),
  aiScoreDetails.model label updated. Backend tsc clean, main.py parses clean.
- Phase 2: done — Welcome.vue's 'Acme Inc.'/'acme'/'jamie@acme.com' fallbacks
  replaced with real authStore.company/.user data. vue-tsc clean.
- Phase 3: done — PATCH /auth/company (RecruiterAuthGuard, slug-collision
  409), frontend updateCompany store action, Welcome.vue Step 1 now actually
  saves on Skip/Publish if changed (non-blocking on failure). 4 new backend
  tests, both typechecks clean.
- Phase 4: done — POST /ai/generate-job-description (Groq
  llama-3.3-70b-versatile, JSON mode, throttled 10/min), Welcome.vue Step 2
  generates a real draft or lets the recruiter write their own; Publish
  creates the job via existing POST /jobs. 5 new backend tests, both
  typechecks clean.
- Phase 5: done — GET /dashboard/suggestions (Groq, non-critical — swallows
  failures to []), Dashboard.vue AI card shows real suggestions with loading
  state, falls back to "Coming soon" only on genuine empty result. 2 new
  backend tests, both typechecks clean.
- Phase 6: done — user resolved both schema gaps by removing scope: Sources
  donut deleted entirely (SourceDonut.vue removed, no application.source
  field ever added); time-in-stage + time-to-hire deleted entirely
  (TimeInStage.vue removed, KPI dropped) — no ApplicationStageHistory table
  built. New GET /analytics/summary (funnel zero-filled across 5 forward
  stages, 10-bucket AI-score histogram, top-5 jobs by volume with real
  avgScore/hires) backed by new src/analytics module. FunnelChart.vue and
  ScoreHistogram.vue converted from owning mock data to accepting props.
  Analytics.vue fully rewritten: real KPIs (total applications, hired,
  conversion %), loading/error+retry states. 3 new backend tests, both
  typechecks clean.

All 6 phases complete. Backend Jest: 43/44 (1 pre-existing unrelated flaky
date-window test in dashboard.service.spec.ts, documented before this work
started — not a regression). Both frontend/backend typechecks clean
throughout. No commits made — working tree left for user's own git add/commit.


## Notes

- No commits/pushes at any point — user handles git per standing project
  convention (confirmed in CLAUDE.md).
- Groq key handling: value provided in chat goes only into gitignored `.env`
  files, never echoed back or written to a committed file.
