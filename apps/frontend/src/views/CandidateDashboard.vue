<template>
  <!-- Content only; chrome (app bar + nav) lives in CandidateLayout. -->
  <div class="cand-content">
    <!-- Heading -->
    <div class="cand-head">
      <div>
        <div class="hf-muted" style="font-size: 13px; margin-bottom: 4px">
          Welcome back, {{ firstName }}
        </div>
        <h1 class="cand-title">Your applications</h1>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="app-list">
      <div v-for="n in 3" :key="n" class="hf-card app-card skeleton-card">
        <div class="sk-line" style="width: 40%" />
        <div class="sk-line" style="width: 70%" />
        <div class="sk-line" style="width: 100%; height: 18px" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="hf-card state-card">
      <div class="state-title">Couldn’t load your applications</div>
      <div class="hf-muted" style="font-size: 13px">{{ error }}</div>
      <button class="hf-btn primary" style="margin-top: 14px" @click="load">Try again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="applications.length === 0" class="hf-card state-card">
      <div style="font-size: 30px; margin-bottom: 8px">📭</div>
      <div class="state-title">No applications yet</div>
      <div class="hf-muted" style="font-size: 13px; max-width: 360px">
        When you apply to a role through a company’s careers page, it’ll show up here so you can
        track its progress.
      </div>
    </div>

    <template v-else>
      <!-- Offer highlight banner (only when a real offer exists) -->
      <div v-if="offerApp" class="offer-banner">
        <div style="font-size: 28px">🎉</div>
        <div style="flex: 1">
          <div class="offer-title">You have an offer from {{ offerApp.job.company.name }}</div>
          <div class="offer-sub">
            {{ offerApp.job.title }}<template v-if="salary(offerApp)"> · {{ salary(offerApp) }}</template>
          </div>
        </div>
        <button class="hf-btn ghost" style="background: white" @click="activeFilter = 'Offers'">
          View offer<HfIcon name="arrowRight" :size="14" />
        </button>
      </div>

      <!-- Filter chips -->
      <div class="chips-row">
        <div
          v-for="c in filters"
          :key="c.name"
          class="chip"
          :class="{ active: c.name === activeFilter }"
          @click="activeFilter = c.name"
        >
          {{ c.name }}
          <span class="chip-count" :class="{ active: c.name === activeFilter }">{{ c.n }}</span>
        </div>
      </div>

      <!-- Application list -->
      <div v-if="visibleApplications.length" class="app-list">
        <div v-for="a in visibleApplications" :key="a.id" class="hf-card app-card">
          <div class="app-top">
            <div
              class="app-logo"
              :style="{ background: logoGradient(a.job.company.name) }"
            >
              <img v-if="a.job.company.logoUrl" :src="a.job.company.logoUrl" alt="" class="app-logo-img" />
              <template v-else>{{ a.job.company.name.charAt(0).toUpperCase() }}</template>
            </div>
            <div style="flex: 1; min-width: 0">
              <div class="hf-muted" style="font-size: 12px; font-weight: 500">
                {{ a.job.company.name }}
              </div>
              <div class="app-role">{{ a.job.title }}</div>
              <div class="app-meta">
                <span v-if="location(a)"><HfIcon name="map" :size="14" />{{ location(a) }}</span>
                <span v-if="salary(a)">💰 {{ salary(a) }}</span>
                <span><HfIcon name="cal" :size="14" />Applied {{ appliedDate(a.appliedAt) }}</span>
              </div>
            </div>
            <div class="app-fit">
              <span v-if="a.aiFitScore !== null" class="hf-score" :class="scoreLevel(a.aiFitScore)">
                {{ a.aiFitScore }}
              </span>
              <span v-else class="hf-score" style="opacity: 0.5">—</span>
              <span class="app-fit-label">Your fit</span>
            </div>
          </div>

          <!-- Stage stepper (hidden for rejected) -->
          <div v-if="a.currentStage !== 'REJECTED'" class="stepper">
            <template v-for="(s, i) in stages" :key="s">
              <div class="step">
                <div
                  class="step-dot"
                  :class="{ done: i < stageIndex(a.currentStage), active: i === stageIndex(a.currentStage) }"
                >
                  <HfIcon v-if="i < stageIndex(a.currentStage)" name="check" :size="10" :stroke="3" />
                </div>
                <div
                  class="step-label"
                  :class="{ on: i <= stageIndex(a.currentStage), active: i === stageIndex(a.currentStage) }"
                >
                  {{ s }}
                </div>
              </div>
              <div v-if="i < stages.length - 1" class="step-line" :class="{ done: i < stageIndex(a.currentStage) }" />
            </template>
          </div>
          <div v-else class="rejected-bar">Not selected for this role</div>

          <!-- Activity footer -->
          <div class="app-foot">
            <div class="app-foot-icon" :class="activityKind(a.currentStage)">
              <template v-if="a.currentStage === 'OFFER'">🎉</template>
              <HfIcon v-else-if="activityKind(a.currentStage) === 'positive'" name="cal" :size="14" />
              <HfIcon v-else name="clock" :size="13" />
            </div>
            <div style="font-size: 13px; font-weight: 500; flex: 1">
              {{ activityText(a.currentStage) }}
            </div>
            <RouterLink
              v-if="a.job.jobAvailable"
              class="hf-btn ghost"
              :to="{ name: 'public-job', params: { companySlug: a.job.company.slug, jobId: a.job.id } }"
            >
              View job<HfIcon name="arrowRight" :size="14" />
            </RouterLink>
            <span v-else class="hf-muted" style="font-size: 12px">No longer accepting</span>
          </div>
        </div>
      </div>

      <!-- Filtered-to-empty -->
      <div v-else class="hf-card state-card">
        <div class="hf-muted" style="font-size: 13px">No applications in “{{ activeFilter }}”.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCandidateAuthStore } from '@/stores/candidateAuth.store'
import { useCandidateApplicationsStore } from '@/stores/candidateApplications.store'
import { scoreLevel } from '@/utils/score'
import type { CandidateApplication, CandidateAppStage } from '@/types/candidateApplication'
import HfIcon from '@/components/common/HfIcon.vue'

const candidateAuth = useCandidateAuthStore()
const appsStore = useCandidateApplicationsStore()
const { applications, loading, error } = storeToRefs(appsStore)

const firstName = computed(() => (candidateAuth.candidateName || 'there').split(' ')[0])

const stages = ['Applied', 'Screened', 'Interview', 'Offer', 'Hired']
const STAGE_INDEX: Record<CandidateAppStage, number> = {
  APPLIED: 0,
  SCREENED: 1,
  INTERVIEW: 2,
  OFFER: 3,
  HIRED: 4,
  REJECTED: -1,
}
function stageIndex(stage: CandidateAppStage): number {
  return STAGE_INDEX[stage]
}

function load() {
  appsStore.fetchApplications()
}
onMounted(load)

// ── Filters (client-side over the fetched list) ──
const activeFilter = ref('All')
const ACTIVE_STAGES: CandidateAppStage[] = ['APPLIED', 'SCREENED', 'INTERVIEW']
const CLOSED_STAGES: CandidateAppStage[] = ['HIRED', 'REJECTED']

const counts = computed(() => ({
  All: applications.value.length,
  Active: applications.value.filter((a) => ACTIVE_STAGES.includes(a.currentStage)).length,
  Interviewing: applications.value.filter((a) => a.currentStage === 'INTERVIEW').length,
  Offers: applications.value.filter((a) => a.currentStage === 'OFFER').length,
  Closed: applications.value.filter((a) => CLOSED_STAGES.includes(a.currentStage)).length,
}))

const filters = computed(() => [
  { name: 'All', n: counts.value.All },
  { name: 'Active', n: counts.value.Active },
  { name: 'Interviewing', n: counts.value.Interviewing },
  { name: 'Offers', n: counts.value.Offers },
  { name: 'Closed', n: counts.value.Closed },
])

const visibleApplications = computed(() => {
  const list = applications.value
  switch (activeFilter.value) {
    case 'Active':
      return list.filter((a) => ACTIVE_STAGES.includes(a.currentStage))
    case 'Interviewing':
      return list.filter((a) => a.currentStage === 'INTERVIEW')
    case 'Offers':
      return list.filter((a) => a.currentStage === 'OFFER')
    case 'Closed':
      return list.filter((a) => CLOSED_STAGES.includes(a.currentStage))
    default:
      return list
  }
})

const offerApp = computed(() => applications.value.find((a) => a.currentStage === 'OFFER') ?? null)

// ── Derived display helpers ──
const WORK_MODE: Record<string, string> = { REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On-site' }
function location(a: CandidateApplication): string {
  const parts = [a.job.location, a.job.jobType ? WORK_MODE[a.job.jobType] ?? a.job.jobType : null]
  return parts.filter(Boolean).join(' · ')
}

const CURRENCY: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', PKR: '₨' }
function money(v: number, cur: string | null): string {
  const sym = CURRENCY[cur ?? 'USD'] ?? ''
  return v >= 1000 ? `${sym}${Math.round(v / 1000)}k` : `${sym}${v}`
}
function salary(a: CandidateApplication): string {
  const { salaryMin, salaryMax, salaryCurrency } = a.job
  if (salaryMin && salaryMax) return `${money(salaryMin, salaryCurrency)} – ${money(salaryMax, salaryCurrency)}`
  if (salaryMin) return `From ${money(salaryMin, salaryCurrency)}`
  if (salaryMax) return `Up to ${money(salaryMax, salaryCurrency)}`
  return ''
}

function appliedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function activityKind(stage: CandidateAppStage): 'offer' | 'positive' | 'neutral' {
  if (stage === 'OFFER') return 'offer'
  if (stage === 'SCREENED' || stage === 'INTERVIEW' || stage === 'HIRED') return 'positive'
  return 'neutral'
}
const ACTIVITY_TEXT: Record<CandidateAppStage, string> = {
  APPLIED: 'Application submitted · under review',
  SCREENED: 'Passed the AI screen · with the recruiter',
  INTERVIEW: 'In the interview stage',
  OFFER: 'Offer extended',
  HIRED: 'You were hired 🎉',
  REJECTED: 'Not selected for this role',
}
function activityText(stage: CandidateAppStage): string {
  return ACTIVITY_TEXT[stage]
}

// Stable per-company gradient when no logo is available.
const PALETTE = ['#F97316', '#0EA5E9', '#8B5CF6', '#10B981', '#EC4899', '#6366F1', '#F59E0B']
function logoGradient(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const c = PALETTE[h % PALETTE.length]
  return `linear-gradient(135deg, ${c}, ${c}cc)`
}
</script>

<style scoped>
.cand-content { display: flex; flex-direction: column; gap: 28px; }

.cand-head { display: flex; align-items: flex-end; gap: 16px; }
.cand-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.025em; }

.offer-banner {
  padding: 18px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fef3c7, #fed7aa);
  border: 1px solid #fde68a;
  display: flex;
  align-items: center;
  gap: 16px;
}
.offer-title { font-size: 14.5px; font-weight: 600; color: #92400e; }
.offer-sub { font-size: 12.5px; color: #b45309; margin-top: 2px; }

.chips-row { display: flex; align-items: center; gap: 8px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 99px;
  background: white;
  border: 1px solid var(--hf-border);
  color: var(--hf-text);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}
.chip.active { background: var(--hf-text); border-color: var(--hf-text); color: white; }
.chip-count {
  font-size: 10.5px;
  font-family: var(--hf-mono);
  background: var(--hf-bg);
  color: var(--hf-text-muted);
  padding: 0 6px;
  border-radius: 5px;
}
.chip-count.active { background: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.85); }

.app-list { display: flex; flex-direction: column; gap: 14px; }
.app-card { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.app-top { display: flex; align-items: flex-start; gap: 14px; }
.app-logo {
  width: 48px;
  height: 48px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
  overflow: hidden;
}
.app-logo-img { width: 100%; height: 100%; object-fit: cover; }
.app-role { font-size: 15px; font-weight: 600; margin-top: 2px; letter-spacing: -0.01em; }
.app-meta {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--hf-text-muted);
  flex-wrap: wrap;
}
.app-meta span { display: inline-flex; align-items: center; gap: 4px; }
.app-fit { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.app-fit-label {
  font-size: 10.5px;
  color: var(--hf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* Stage stepper */
.stepper { display: flex; align-items: center; width: 100%; }
.step { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
.step-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 1.5px solid var(--hf-border-strong);
  display: grid;
  place-items: center;
  color: white;
}
.step-dot.done { background: var(--hf-accent); border: 0; }
.step-dot.active { border: 2.5px solid var(--hf-accent); }
.step-label { font-size: 10.5px; font-weight: 500; color: var(--hf-text-subtle); white-space: nowrap; }
.step-label.on { color: var(--hf-text); }
.step-label.active { font-weight: 600; }
.step-line { flex: 1; height: 2px; background: var(--hf-border); position: relative; top: -10px; margin: 0 4px; }
.step-line.done { background: var(--hf-accent); }

.rejected-bar {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--hf-danger);
  background: var(--hf-danger-soft);
  padding: 8px 12px;
  border-radius: 8px;
}

.app-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--hf-border);
}
.app-foot-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--hf-bg);
  color: var(--hf-text-muted);
}
.app-foot-icon.positive { background: var(--hf-accent-soft); color: #047857; }
.app-foot-icon.offer { background: var(--hf-warn-soft); color: #b45309; }

/* State cards (loading / empty / error) */
.state-card {
  padding: 44px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.state-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.skeleton-card { gap: 12px; }
.sk-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: sk 1.4s ease infinite;
}
@keyframes sk {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
