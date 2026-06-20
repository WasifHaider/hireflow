# HireFlow — Project Memory for Claude Code

## What this is

HireFlow is a multi-tenant SaaS hiring platform with AI-powered candidate screening.
This is a portfolio project for Wasif Haider (job hunt → Systems Limited and global FAANG-tier).

## Architecture

- Monorepo with three apps under `apps/`:
  - `backend/` — Nest.js + TypeScript + Prisma + Supabase Postgres + Bull/Redis
  - `frontend/` — Vue 3 + Vuetify 3 + Vite + Pinia + Vue Router + TypeScript
  - `ml-service/` — Python 3.11 + FastAPI (currently a stub; ML scoring lands in sub-phase E)
- No monorepo tooling (no Nx/Turborepo). Plain folders only.

## Tech locks (do NOT swap)

- Backend: Nest.js, Prisma, Supabase Postgres, Supabase Storage
- Frontend: Vue 3 + Vuetify 3 + Pinia (no Vuex, no Tailwind in v1)
- Auth: JWT + bcrypt (rolling our own, NOT Supabase Auth, for learning value)
- Queue: Bull + Redis (Upstash for dev)
- Email: Resend (with console-log fallback when no API key)
- Storage: Supabase Storage (private buckets, signed URLs with short expiry)

## Conventions

- Prisma: PascalCase models, camelCase fields, snake_case DB columns via @map/@@map
- Tenant isolation: companyId always derived from JWT, NEVER from request body
- For tenant-scoped lookups: ALWAYS use `findFirst({ where: { id, companyId } })`, NEVER `findUnique({ where: { id } })`
- Public-facing 403 → 404 to avoid existence leaks (enumeration defense)
- Soft delete via `deletedAt` for any table referenced by other tables
- All queries on multi-tenant tables MUST filter by companyId
- Sensitive fields (passwordHash) must NEVER appear in API responses — strip explicitly
- File uploads: validate magic bytes, not just MIME type
- External service work (storage upload, OpenAI call) goes OUTSIDE Prisma transactions
- When work spans services, use compensating actions (try DB; if it fails, undo the external action)
- Queue jobs must be idempotent (check DB for completion state before doing work)

## Frontend design & build (READ before any UI work)

- **Design reference**: `C:\Users\whaid\Downloads\HireFlow (2)` (WSL: `/mnt/c/Users/whaid/Downloads/HireFlow (2)`).
  - `screens/*.jsx` — one file per screen (e.g. `v1_welcome.jsx`, `company_auth.jsx`, `candidate_auth.jsx`, `dashboard.jsx`, `jobs_list.jsx`, `job_form.jsx`, `candidates_list.jsx`, `pipeline.jsx`, `inbox.jsx`, `analytics.jsx`, `settings.jsx`, `public_job.jsx`).
  - `styles.css` — source of truth for design tokens (`--hf-primary #4F46E5`, `--hf-accent #10B981`, `--hf-bg #F9FAFB`, `--hf-border #E5E7EB`, radii, shadows, Inter/JetBrains-Mono) + shared classes.
  - `shared.jsx` — mock icons/components.
  - ALWAYS read the matching screen jsx + pull exact colors/radii from styles.css before building/redesigning. Match pixel-for-pixel.
- **Component priority (user directive)**: 1) Vuetify components first (`v-btn`, `v-text-field`, `v-select`, `v-autocomplete`, `v-checkbox`, `v-card`, `v-icon`). 2) Then our shared wrappers in `src/components/common/`: `AppField` (text/email/password/select/autocomplete; `prefix`, `#label-action`/`#append` slots), `AppButton` (`primary`/`ghost`, `block`, `loading`), `AppCheckbox`, `SocialButtons` (`providers`+`soon`). 3) Custom HTML only when Vuetify can't match (e.g. Welcome's bordered Workspace-URL prefix). Reuse — never re-hand-roll raw button/input/checkbox markup.
- Vuetify overrides via `:deep()` in the wrapper's scoped style (kill `.v-btn__overlay`, `text-transform: none`). Watch specificity — don't set `min-width` on `.app-btn.v-btn` base or `block` collapses.
- Verify UI changes with `npx vue-tsc --noEmit -p tsconfig.app.json` (run from apps/frontend).

## What's done so far

- ✅ Monorepo scaffolding (Nest + Vue + FastAPI stub)
- ✅ Supabase project + Prisma setup + first migration (companies, users)
- ✅ Recruiter auth module: signup, signin, JWT, /me — tested
- ✅ Jobs CRUD with tenant isolation — tested (cross-tenant 404 verified)
- ✅ Sub-phase A: Public application endpoint (anonymous candidates, candidates + applications tables, rate limiting via @nestjs/throttler) — tested
- ✅ Sub-phase B: Resume upload to Supabase Storage with magic byte validation, compensating rollback on failure, recruiter-side signed URL endpoint with 5-min expiry — tested
- ✅ Frontend smoke test: Vuetify + axios + Pinia + Vue Router foundations + Company signup, signin, dashboard placeholder fully wired end-to-end
- ✅ Frontend Week 3 (in progress): Company signup/signin + Welcome (matched to design) + Candidate signup/signin pages built. Shared component library in `src/components/common/` (AppField, AppButton, AppCheckbox, SocialButtons) — all auth+welcome pages use them (Vuetify-first). Candidate auth wired to backend (separate `candidateAuth.store.ts`, token key `candidate_access_token`); candidate session NOT yet in global hydrate/guards/interceptor. Candidate dashboard is a minimal placeholder (full design in candidate_auth.jsx, not built).
- ✅ Sub-phase C: Bull + Redis background job processing (Upstash, TLS), application-scoring queue, stub processor (random score 50-95), bull-board dashboard at /api/queues, exponential backoff (5s/10s/20s), 3 attempts, concurrency 3, DB-level idempotency check, retry behavior verified by intentional failure injection
- ✅ Sub-phase D: Candidate auth (signup → email verify → signin) — separate JWT flow from recruiters. JWT carries userType ('recruiter'|'candidate'); RecruiterAuthGuard/CandidateAuthGuard enforce per-type access (all recruiter endpoints swapped off the bare JwtAuthGuard). Defense-2 reconciliation: anonymous applications link to the account only after email verification (the candidate row IS the anonymous row via upsert-by-email, so linking is implicit). Single-use crypto-random verification tokens (24h, not JWTs). MailService (Resend + console fallback, @Global). GET /candidate/me/applications dashboard with jobAvailable flag for soft-deleted jobs. resend ^6.12.4 installed. All 10 verification points tested green (incl. reconciliation, cross-type guards, rate limit). Plan/results: apps/backend/docs/sub-phase-d-plan.html
- ✅ Frontend Week 3 — Dashboards: Recruiter dashboard (`src/views/Dashboard.vue`) + Candidate dashboard (`src/views/CandidateDashboard.vue`) built pixel-matched to design (dashboard.jsx / candidate_auth.jsx). App chrome = layout route, not slot wrapper: `src/layouts/RecruiterLayout.vue` (Vuetify `v-app-bar` + collapsible `v-navigation-drawer` rail + `v-list`) and `CandidateLayout.vue` (sidebar-less, nav tabs) are pathless **parent routes**; screens are children rendering through `<RouterView/>`, so chrome mounts once and persists across nav. Shared chrome atoms `src/components/common/AppBarLogo.vue` + `UserMenu.vue`. (Replaced the old hand-rolled `RecruiterShell.vue` — chrome is now Vuetify-first like the forms.) New `src/components/common/HfIcon.vue` (Lucide icon set ported from mockup `I.*`). New global `src/assets/hireflow.css` (design tokens + hf-* classes, imported in main.ts) so dashboards reuse mockup classes verbatim; JetBrains Mono added to index.html font link. Greeting/workspace/avatar pull from auth/candidate stores; all list/stat/chart data is MOCK pending backend wiring. typecheck green. Old Vuetify `AppLayout.vue` no longer used by Dashboard (still used by Welcome).
- ✅ Recruiter dashboard backend integration: two new RecruiterAuthGuard endpoints — `GET /applications` (paginated list, reusable; `src/applications/` extended with `findAll`, query+response DTOs, explicit `select` so no resumeText/resumeUrl/aiScoreDetails/coverLetter leak) and `GET /dashboard/summary` (new `src/dashboard/` module: stats {activeJobs=PUBLISHED jobs, totalApplications, avgAiScore, awaitingReview=APPLIED count}, pipeline groupBy currentStage zero-filled, applicationsPerDay 7-day timeseries via Prisma.sql raw query zero-filled). Frontend `src/stores/dashboard.store.ts` loads both on mount; `Dashboard.vue` fully wired (real stat cards — trend pills dropped, no historical data; "Awaiting review" replaces time-to-hire; AI suggestions → "Coming soon"; table empty-state). /auth/me hydration already drives greeting/workspace/avatar (router guard + RecruiterLayout). Jest 5/5 green (mocked Prisma unit tests), both typechecks clean. Branch feat/recruiter-dashboard-integration. Spec+plan: docs/superpowers/{specs,plans}/2026-06-19-recruiter-dashboard-integration*. KNOWN minor: timeseries date keys use local-midnight→toISOString (UTC) — possible off-by-one bucket in non-UTC server TZ; revisit if chart looks shifted.
- ✅ Sub-phase E: Real ML scoring (stub replaced). Python ml-service POST /score (apps/ml-service/main.py): embeds resume_text + job_description with OpenAI text-embedding-3-small (single batched call), cosine similarity → clamp ≥0 → ×100. 422 on empty/blank, 502 on OpenAI failure (retryable), 503 if key unset. NestJS processor (apps/backend/src/queues/application-scoring/): download resume bytes via StorageService.downloadResume (signed URL + fetch) → extract text via pdf-parse v2 (PDFParse class, must destroy(), see pdf-text.util.ts) → POST ml-service via MlScoringClient (@nestjs/axios HttpModule, 30s timeout) → write aiFitScore + resumeText + aiScoreDetails. Idempotency guard kept (aiFitScore !== null → skip). Empty-text PDFs short-circuit to score 0 (reason: no_extractable_text) to avoid retry loop. Deps: @nestjs/axios, axios, pdf-parse (node); openai, numpy, python-dotenv, pdfplumber (python, in requirements.txt). ML_SERVICE_URL=http://localhost:8100. ml-service standalone verified (live: matching→80, mismatched→29; validation+error paths green). Full backend→queue e2e (real submission) still to be run by user.
- ✅ Job creation screen (recruiter): 4-step wizard, real backend. Migration `add_job_details_fields` added 6 Job columns (department, mustHaveSkills String[], niceToHaveSkills String[], minExperienceYears Int?, education String?, autoRejectScore Int?). CreateJobDto extended (class-validator: arrays max 30 / 60 chars each, score 0-100, exp 0-50); service.create maps them, update() spreads dto. Frontend: `views/JobForm.vue` thin container (state/validation/nav/submit) + components broken out under `components/jobs/` (JobStepper, StepBubble, JobDetailsStep, JobRequirementsStep, JobPipelineStep, JobReviewStep, JobPreview, SkillChipInput) + reusable `components/common/SegmentedTabs.vue`. Vuetify-first: AppField (text/select), v-textarea, v-slider, v-combobox (chips). Live preview pane updates as you type. **Pipeline editor DEFERRED** — step 3 shows the 6 FIXED ApplicationStage stages read-only (custom per-job stages would need a JobStage table + reworking the enum; own later phase). Routes: /jobs/new, /jobs/:id/edit (props:true, edit mode loads via fetchJob), /jobs→redirect /jobs/new (jobs LIST screen not built). Post-submit → /dashboard. Store `stores/jobs.store.ts`. Note: form keeps a Requirements textarea (backend `requirements`, feeds ML scoring + public page) ALONGSIDE skills chips — slight deviation from mockup (chips-only), justified to preserve ML signal. Description textarea added to step 1 (mockup omits it; required by backend + shown in preview). typecheck green both sides; backend→DB write not yet manually exercised by user. KNOWN: UserMenu dropdown restyled to hf tokens (red sign-out); HfIcon gained `logout`. Also: JobDetailsStep field-consistency pass — AppField/textarea/SkillChipInput/SegmentedTabs all unified to the design's light `--hf-border` + indigo focus ring (AppField was the dark `#a3a4a8` outlier; this changes auth fields too, intentionally); select height fixed (collapsed Vuetify's floating-label reserve); salary `$` prefix centered; **SegmentedTabs rewritten from hand-rolled buttons to Vuetify `v-btn-toggle`** (mandatory + a11y) with self-contained pill styling.
- ✅ Recruiter Jobs List screen (`/jobs`): built subagent-driven from spec+plan (docs/superpowers/{specs,plans}/2026-06-20-recruiter-jobs-list*). Backend: `GET /jobs` list query now returns `applicationCount` per row (Prisma `_count.applications` flattened; tenant isolation untouched; Jest unit test added — there was no jobs spec before). Frontend: new `fetchJobs`/`setJobStatus`/`deleteJob` store actions + types (`JobListItem`/`JobListResponse`/`JobListQuery`); `/jobs` redirect→real route. New `views/JobsList.vue` container (filter/page state, 300ms debounced search, delete `v-dialog`, `v-snackbar`) + `components/jobs/{JobsToolbar,JobsTable,JobStatusPill}.vue`. All wired to backend: search (title+location), status tabs (All/Draft/Published/Closed → status param), sortable Title/Opened headers, **server-side** pagination, and per-row actions Edit/Publish/Close/Reopen/Delete (status via PATCH, soft delete). Loading = skeleton rows (project rule: every fetch shows a loading state). Dropped vs mockup (no backend): stats strip, top-fits, owner, pinned, board toggle, per-tab counts. Final whole-branch review: ready-to-merge, 0 Critical/Important. typecheck green; backend Jest green. KNOWN: "Opened" shows `publishedAt ?? createdAt` but sorts by `publishedAt` only → drafts (null publishedAt) can look out-of-order when mixed; manual e2e (live click-through with a logged-in recruiter) still to be run by user.

## Where I'm at

- Sub-phase E code complete; ml-service standalone verified live. Full backend→queue e2e DEFERRED by user decision (each run burns OpenAI credits) — will run once during final integration pass when whole app is ready, not now. Recruiter dashboard + jobs list now wired to real endpoints (see bullets above) — done on branch feat/recruiter-dashboard-integration (not yet merged). NEXT: run jobs-list manual e2e (logged-in recruiter click-through); wire CANDIDATE dashboard to GET /candidate/me/applications (still mock); then remaining recruiter screens (pipeline, candidates, inbox, analytics, settings, public job) still to build.
- ml-service: has its own apps/ml-service/.env with OPENAI_API_KEY (gitignored). Windows venv at apps/ml-service/venv (Scripts/*.exe) — run uvicorn on port 8100 from Windows. WSL system python is 3.12; the repo venv won't run under WSL.
- Mail: RESEND_API_KEY now set in apps/backend/.env (live Resend mode); EMAIL_FROM=onboarding@resend.dev, EMAIL_FROM_NAME=HireFlow, APP_URL=http://localhost:5173
- Open follow-ups deferred to later phases (NOT yet built): "resend verification email" endpoint, password reset, frontend /verify-candidate route. Note: re-signup with an unverified email regenerates the token (acts as implicit resend).

## Upcoming phases

- Frontend Week 3 sprint: build all 13 designed screens with backend integration
- Deployment: Railway (backend + ml-service) + Vercel (frontend)

## Learning rules (READ THIS)

- I want to understand what's being built, not just receive code
- Explain WHY for every non-obvious decision
- Flag any pattern that's a common interview question
- When introducing a new concept I might not know, explain it inline
- For any destructive command (migrate, drop, install), ask before running
- Prefer small steps with checkpoints over big monolithic changes
- If you'd suggest installing a new dependency, explain what it does and why

## Code quality bar

- Production-grade error handling (no silent failures)
- Swagger decorators on every endpoint with proper @ApiTags, @ApiOperation, @ApiResponse
- Proper TypeScript types (no `any` unless justified)
- Logging for important state changes (queue events, auth events, errors)
- Comments only for non-obvious decisions, not for what the code already says
- Strip sensitive fields (passwordHash, internal flags) from all API responses
- Rate limiting on auth endpoints and public-facing endpoints (5 req/min for sensitive ones)

## Security-critical patterns already in use

- bcrypt cost 10 (outside DB transactions)
- JWTs signed with HS256; discriminated payload by userType — recruiter: {sub, email, userType:'recruiter', role, companyId}; candidate: {sub, email, userType:'candidate'}. Legacy tokens without userType fall back to recruiter.
- Two-guard pattern: RecruiterAuthGuard / CandidateAuthGuard reject wrong-type tokens (401); strategy fetches the matching table per userType
- Magic byte validation for file uploads (not just MIME)
- Compensating actions for cross-service consistency (storage + DB)
- Signed URLs with 5-min expiry, generated on-demand with tenant check
- Tenant isolation enforced in service layer (every query filters by companyId)
- 404 over 403 for cross-tenant resource access (enumeration defense)
- DTOs use whitelist + forbidNonWhitelisted (extra fields rejected)
- jobId-based dedup at enqueue + DB-level idempotency in processor

## Files of particular importance

- `apps/backend/src/auth/` — JWT strategy (userType branch), recruiter + candidate guards, recruiter auth
- `apps/backend/src/auth/candidate/` — candidate auth (signup/verify/signin), defense-2 reconciliation
- `apps/backend/src/mail/` — MailService (Resend + console fallback), verification email template
- `apps/backend/src/candidate/` — candidate dashboard (GET /candidate/me/applications)
- `apps/backend/src/jobs/` — tenant-scoped Jobs CRUD reference pattern
- `apps/backend/src/public/public.service.ts` — submitApplication, the most complex service method (upsert candidate → upload → create application → enqueue scoring with compensating rollback)
- `apps/backend/src/storage/storage.service.ts` — Supabase Storage wrapper with signed URL minting
- `apps/backend/src/queues/application-scoring/` — Bull producer/processor pattern with idempotency
- `apps/backend/prisma/schema.prisma` — source of truth for data model

## URGENT / Open items

- None right now. Sub-phase D fully verified (10/10 tests green). Ready to start sub-phase E.
