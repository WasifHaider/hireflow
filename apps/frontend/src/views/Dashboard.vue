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
        <button class="hf-btn primary" @click="router.push('/jobs/new')">
          <HfIcon name="plus" :size="14" />New job
        </button>
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
              <div class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">All</div>
              <div class="tab" :class="{ active: activeTab === 'top-fit' }" @click="activeTab = 'top-fit'">Top fit</div>
              <div class="tab" :class="{ active: activeTab === 'needs-review' }" @click="activeTab = 'needs-review'">
                Needs review
              </div>
            </div>
            <v-menu v-model="filterMenuOpen" :close-on-content-click="false" location="bottom end">
              <template #activator="{ props: act }">
                <button class="hf-btn ghost" v-bind="act">
                  <HfIcon name="filter" :size="14" />Filter
                  <span v-if="stageFilter.length" class="hf-tag badge">{{ stageFilter.length }}</span>
                </button>
              </template>
              <div class="stage-filter-pop">
                <v-checkbox
                  v-for="s in FUNNEL_WITH_REJECTED"
                  :key="s"
                  :model-value="stageFilter.includes(s)"
                  :label="STAGE_LABELS[s]"
                  density="compact"
                  hide-details
                  @update:model-value="(checked: boolean | null) => toggleStage(s, !!checked)"
                />
                <div class="stage-filter-actions">
                  <button class="hf-btn ghost" @click="stageFilter = []">Clear</button>
                  <button class="hf-btn primary" @click="filterMenuOpen = false">Done</button>
                </div>
              </div>
            </v-menu>
          </div>
        </div>
        <AppDataTable
          v-if="dashboard.loading || candidates.length"
          :columns="appColumns"
          :rows="filteredCandidates"
          item-value="name"
          @row-click="onRowClick"
          @action="onRowAction"
        />
        <div
          v-else-if="!dashboard.loading && filteredCandidates.length === 0 && candidates.length"
          class="hf-muted"
          style="padding: 32px 20px; text-align: center; font-size: 13px"
        >
          No applications match this filter.
        </div>
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
          <div v-if="dashboard.suggestionsLoading" class="ai-coming-soon">
            <HfIcon name="sparkles" :size="18" />
            <div style="font-size: 12.5px; font-weight: 500">Thinking…</div>
          </div>
          <template v-else-if="dashboard.suggestions.length">
            <div v-for="(s, i) in dashboard.suggestions" :key="i" class="ai-item">
              <div class="ai-item-icon"><HfIcon name="sparkles" :size="11" /></div>
              <span style="font-size: 12.5px; line-height: 1.5">{{ s }}</span>
            </div>
          </template>
          <div v-else class="ai-coming-soon">
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
const router = useRouter()

const firstName = computed(() => (authStore.userFullName || 'there').split(' ')[0])

onMounted(() => {
  void dashboard.load()
  void dashboard.fetchSuggestions()
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
const FUNNEL_WITH_REJECTED: ApplicationStage[] = [...FUNNEL, 'REJECTED']

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
    id: a.id,
    name: a.candidate.fullName,
    email: a.candidate.email,
    role: a.job.title,
    loc: '',
    score: a.aiFitScore ?? 0,
    rawScore: a.aiFitScore,
    stage: STAGE_LABELS[a.currentStage],
    rawStage: a.currentStage,
    date: timeAgo(a.appliedAt),
  })),
)

// ── "All / Top fit / Needs review" tabs + Filter popover ────────────────────
// Client-side filtering over the already-fetched "recent applications" list
// (this card is a bounded recent-activity feed, not a full paginated table —
// same reasoning as why it has no server-side filter params).
type TabKey = 'all' | 'top-fit' | 'needs-review'
const activeTab = ref<TabKey>('all')
const filterMenuOpen = ref(false)
const stageFilter = ref<ApplicationStage[]>([])

function toggleStage(stage: ApplicationStage, checked: boolean) {
  stageFilter.value = checked
    ? [...stageFilter.value, stage]
    : stageFilter.value.filter((s) => s !== stage)
}

const TOP_FIT_THRESHOLD = 80

const filteredCandidates = computed(() => {
  let rows = candidates.value
  if (activeTab.value === 'top-fit') {
    rows = rows.filter((r) => (r.rawScore ?? 0) >= TOP_FIT_THRESHOLD)
  } else if (activeTab.value === 'needs-review') {
    rows = rows.filter((r) => r.rawStage === 'APPLIED')
  }
  if (stageFilter.value.length > 0) {
    rows = rows.filter((r) => stageFilter.value.includes(r.rawStage))
  }
  return rows
})

function onRowClick(row: (typeof candidates.value)[number]) {
  router.push(`/candidates/${row.id}`)
}
function onRowAction({ row }: { row: (typeof candidates.value)[number] }) {
  router.push(`/candidates/${row.id}`)
}

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
  (dashboard.summary?.applicationsPerDay ?? []).map((d) => {
    // `d.date` is a plain "YYYY-MM-DD" UTC calendar-day key from the backend
    // (see dashboard.service.ts). Format the weekday from the UTC parts
    // directly rather than `new Date(d.date).toLocaleDateString()` (which
    // parses as UTC midnight but renders in the browser's local zone — that
    // shifts the label back a day for any negative UTC offset).
    const [y, m, day] = d.date.split('-').map(Number) as [number, number, number]
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' })
  }),
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

.stage-filter-pop {
  padding: 14px;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--hf-surface);
  border-radius: 10px;
}
.stage-filter-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  margin-top: 6px;
  border-top: 1px solid var(--hf-border);
}
.hf-tag.badge {
  margin-left: 4px;
  height: 18px;
  padding: 0 6px;
  font-size: 10.5px;
}


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
