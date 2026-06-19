<template>
  <!-- Content only; chrome (app bar + sidebar) lives in RecruiterLayout. -->
  <div class="dash">
    <!-- Heading -->
    <div class="head-row">
      <div>
        <div class="hf-muted" style="font-size: 12.5px; margin-bottom: 6px">Good morning, {{ firstName }}</div>
        <h1 class="hf-h1">{{ authStore.companyName || 'Your' }} workspace</h1>
      </div>
      <div class="head-actions">
        <button class="hf-btn ghost"><HfIcon name="download" :size="14" />Export</button>
        <button class="hf-btn primary"><HfIcon name="plus" :size="14" />New job</button>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="hf-stats">
      <div v-for="s in stats" :key="s.label" class="hf-card hf-stat">
        <div class="hf-stat-label">{{ s.label }}</div>
        <div class="hf-stat-value">
          {{ s.value }}<span v-if="s.suffix" class="suffix">{{ s.suffix }}</span>
        </div>
        <div class="hf-stat-foot">{{ s.foot }}</div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="main-grid">
      <!-- Recent applications -->
      <div class="hf-card" style="overflow: hidden">
        <div class="hf-card-head">
          <h3 class="hf-h2">Recent applications</h3>
          <span class="hf-tag neutral" style="margin-left: 4px">{{ totalThisList }} total</span>
          <div class="right">
            <div class="hf-tab-row">
              <div class="tab active">All</div>
              <div class="tab">Top fit</div>
              <div class="tab">Needs review</div>
            </div>
            <button class="hf-btn ghost"><HfIcon name="filter" :size="14" />Filter</button>
          </div>
        </div>
        <AppDataTable
          v-if="dashboard.loading || candidates.length"
          :columns="appColumns"
          :rows="candidates"
          item-value="name"
        />
        <div v-else class="hf-muted" style="padding: 32px 20px; text-align: center; font-size: 13px">
          No applications yet.
        </div>
      </div>

      <!-- Right column -->
      <div class="right-col">
        <div class="hf-card hf-chart-card">
          <div style="display: flex; align-items: flex-start">
            <div>
              <div class="hf-stat-label">Applications · last 7 days</div>
              <div class="hf-stat-value" style="margin-top: 2px">{{ chartTotal }}</div>
            </div>
            <button class="hf-btn ghost" style="margin-left: auto; height: 28px; padding: 0 8px; font-size: 12px">
              7d<HfIcon name="chevron" :size="14" />
            </button>
          </div>
          <ApplicationsLineChart :values="chartValues" :labels="chartLabels" :max="chartMax" />
        </div>

        <!-- AI suggestions -->
        <div class="hf-card ai-card">
          <div style="display: flex; align-items: center; gap: 8px">
            <div class="ai-badge"><HfIcon name="sparkles" :size="14" /></div>
            <h3 class="hf-h2">AI suggestions</h3>
          </div>
          <div class="ai-coming-soon">
            <HfIcon name="sparkles" :size="18" />
            <div style="font-size: 12.5px; font-weight: 500">Coming soon</div>
            <div class="hf-cand-sub">AI-powered suggestions land in a future update.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pipeline overview -->
    <div class="hf-card pipeline-card">
      <div style="display: flex; align-items: center">
        <h3 class="hf-h2">Pipeline overview</h3>
        <span class="hf-muted" style="margin-left: auto; font-size: 12px">This month</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px">
        <div v-for="s in pipeline" :key="s.name" class="pipeline-row">
          <div class="pipeline-name">{{ s.name }}</div>
          <div class="hf-meter"><span :style="{ width: s.pct + '%' }" /></div>
          <div class="pipeline-count">{{ s.count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

<style scoped>
.dash { display: flex; flex-direction: column; gap: 24px; }
.head-row { display: flex; align-items: flex-end; gap: 16px; }
.head-actions { margin-left: auto; display: flex; gap: 8px; }
.suffix { font-size: 16px; color: var(--hf-text-muted); font-weight: 500; }

.main-grid { display: grid; grid-template-columns: 1fr 460px; gap: 20px; }
.right-col { display: flex; flex-direction: column; gap: 20px; }


.ai-card { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.ai-badge {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: linear-gradient(135deg, #4f46e5, #a78bfa);
  display: grid;
  place-items: center;
  color: white;
}
.ai-item {
  border: 1px solid var(--hf-border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.ai-item-icon {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: var(--hf-primary-soft);
  color: var(--hf-primary);
  display: grid;
  place-items: center;
  margin-top: 1px;
}

.pipeline-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.pipeline-row { display: grid; grid-template-columns: 78px 1fr 36px; gap: 12px; align-items: center; }
.pipeline-name { font-size: 12.5px; color: var(--hf-text); font-weight: 500; }
.pipeline-count { font-size: 12px; color: var(--hf-text-muted); text-align: right; font-variant-numeric: tabular-nums; }

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
</style>
