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

## What's done so far

- ✅ Monorepo scaffolding (Nest + Vue + FastAPI stub)
- ✅ Supabase project + Prisma setup + first migration (companies, users)
- ✅ Recruiter auth module: signup, signin, JWT, /me — tested
- ✅ Jobs CRUD with tenant isolation — tested (cross-tenant 404 verified)
- ✅ Sub-phase A: Public application endpoint (anonymous candidates, candidates + applications tables, rate limiting via @nestjs/throttler) — tested
- ✅ Sub-phase B: Resume upload to Supabase Storage with magic byte validation, compensating rollback on failure, recruiter-side signed URL endpoint with 5-min expiry — tested
- ✅ Frontend smoke test: Vuetify + axios + Pinia + Vue Router foundations + Company signup, signin, dashboard placeholder fully wired end-to-end
- ✅ Sub-phase C: Bull + Redis background job processing (Upstash, TLS), application-scoring queue, stub processor (random score 50-95), bull-board dashboard at /api/queues, exponential backoff (5s/10s/20s), 3 attempts, concurrency 3, DB-level idempotency check, retry behavior verified by intentional failure injection
- ✅ Sub-phase D: Candidate auth (signup → email verify → signin) — separate JWT flow from recruiters. JWT carries userType ('recruiter'|'candidate'); RecruiterAuthGuard/CandidateAuthGuard enforce per-type access (all recruiter endpoints swapped off the bare JwtAuthGuard). Defense-2 reconciliation: anonymous applications link to the account only after email verification (the candidate row IS the anonymous row via upsert-by-email, so linking is implicit). Single-use crypto-random verification tokens (24h, not JWTs). MailService (Resend + console fallback, @Global). GET /candidate/me/applications dashboard with jobAvailable flag for soft-deleted jobs. resend ^6.12.4 installed. All 10 verification points tested green (incl. reconciliation, cross-type guards, rate limit). Plan/results: apps/backend/docs/sub-phase-d-plan.html
- ✅ Sub-phase E: Real ML scoring (stub replaced). Python ml-service POST /score (apps/ml-service/main.py): embeds resume_text + job_description with OpenAI text-embedding-3-small (single batched call), cosine similarity → clamp ≥0 → ×100. 422 on empty/blank, 502 on OpenAI failure (retryable), 503 if key unset. NestJS processor (apps/backend/src/queues/application-scoring/): download resume bytes via StorageService.downloadResume (signed URL + fetch) → extract text via pdf-parse v2 (PDFParse class, must destroy(), see pdf-text.util.ts) → POST ml-service via MlScoringClient (@nestjs/axios HttpModule, 30s timeout) → write aiFitScore + resumeText + aiScoreDetails. Idempotency guard kept (aiFitScore !== null → skip). Empty-text PDFs short-circuit to score 0 (reason: no_extractable_text) to avoid retry loop. Deps: @nestjs/axios, axios, pdf-parse (node); openai, numpy, python-dotenv, pdfplumber (python, in requirements.txt). ML_SERVICE_URL=http://localhost:8100. ml-service standalone verified (live: matching→80, mismatched→29; validation+error paths green). Full backend→queue e2e (real submission) still to be run by user.

## Where I'm at

- Sub-phase E code complete; ml-service standalone verified live. NEXT: run full e2e (submit a public application with a PDF resume, watch Bull job download→parse→score→DB write) then start sub-phase F / frontend Week 3.
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
