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
          <span class="hf-trend" :class="s.trend.dir">
            <HfIcon :name="s.trend.dir === 'up' ? 'arrowUp' : 'arrowDown'" :size="11" :stroke="2.5" />
            {{ s.trend.value }}
          </span>
        </div>
        <div class="hf-stat-foot">
          <HfIcon v-if="s.footDot" name="dot" :size="8" style="color: #10b981" />{{ s.foot }}
        </div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="main-grid">
      <!-- Recent applications -->
      <div class="hf-card" style="overflow: hidden">
        <div class="hf-card-head">
          <h3 class="hf-h2">Recent applications</h3>
          <span class="hf-tag neutral" style="margin-left: 4px">284 this week</span>
          <div class="right">
            <div class="hf-tab-row">
              <div class="tab active">All</div>
              <div class="tab">Top fit</div>
              <div class="tab">Needs review</div>
            </div>
            <button class="hf-btn ghost"><HfIcon name="filter" :size="14" />Filter</button>
          </div>
        </div>
        <AppDataTable :columns="appColumns" :rows="candidates" item-value="name" />
      </div>

      <!-- Right column -->
      <div class="right-col">
        <div class="hf-card hf-chart-card">
          <div style="display: flex; align-items: flex-start">
            <div>
              <div class="hf-stat-label">Applications · last 7 days</div>
              <div class="hf-stat-value" style="margin-top: 2px">
                147<span class="hf-trend up"><HfIcon name="arrowUp" :size="11" :stroke="2.5" />+22%</span>
              </div>
            </div>
            <button class="hf-btn ghost" style="margin-left: auto; height: 28px; padding: 0 8px; font-size: 12px">
              7d<HfIcon name="chevron" :size="14" />
            </button>
          </div>
          <svg :width="chart.W" :height="chart.H" style="display: block">
            <defs>
              <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.18" />
                <stop offset="100%" stop-color="#4F46E5" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g v-for="g in chart.grid" :key="g.t">
              <line :x1="chart.P.l" :x2="chart.W - chart.P.r" :y1="g.y" :y2="g.y" stroke="#E5E7EB" :stroke-dasharray="g.t === 0 ? '' : '3 3'" />
              <text :x="chart.P.l - 8" :y="g.y + 3" text-anchor="end" font-size="10" fill="#9CA3AF" font-family="var(--hf-mono)">{{ g.t }}</text>
            </g>
            <path :d="chart.area" fill="url(#chartGrad)" />
            <path :d="chart.path" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <g v-for="(p, i) in chart.pts" :key="i">
              <template v-if="i === chart.pts.length - 1">
                <circle :cx="p[0]" :cy="p[1]" r="6" fill="#4F46E5" opacity="0.15" />
                <circle :cx="p[0]" :cy="p[1]" r="3.5" fill="#4F46E5" stroke="white" stroke-width="1.5" />
              </template>
              <circle v-else :cx="p[0]" :cy="p[1]" r="2.5" fill="white" stroke="#4F46E5" stroke-width="1.5" />
              <text :x="p[0]" :y="chart.H - 8" text-anchor="middle" font-size="10.5" fill="#9CA3AF">{{ chart.labels[i] }}</text>
            </g>
            <g>
              <rect :x="chart.last[0] - 38" :y="chart.last[1] - 32" width="76" height="22" rx="6" fill="#111827" />
              <text :x="chart.last[0]" :y="chart.last[1] - 17" text-anchor="middle" font-size="11" fill="white" font-weight="600">34 apps</text>
            </g>
          </svg>
        </div>

        <!-- AI suggestions -->
        <div class="hf-card ai-card">
          <div style="display: flex; align-items: center; gap: 8px">
            <div class="ai-badge"><HfIcon name="sparkles" :size="14" /></div>
            <h3 class="hf-h2">AI suggestions</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div v-for="x in suggestions" :key="x.t" class="ai-item">
              <div class="ai-item-icon"><HfIcon name="sparkles" :size="14" /></div>
              <div style="flex: 1">
                <div style="font-size: 12.5px; font-weight: 500">{{ x.t }}</div>
                <div class="hf-cand-sub" style="margin-top: 2px">{{ x.s }}</div>
              </div>
              <HfIcon name="arrowRight" :size="14" style="color: var(--hf-text-subtle)" />
            </div>
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
import { computed } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'
import AppDataTable, { type Column } from '@/components/common/AppDataTable.vue'
import { useAuthStore } from '@/stores/auth.store'

/* Recruiter dashboard. Visuals match the design mockup 1:1; the data below is
   placeholder until the analytics/applications endpoints are wired in the
   backend-integration pass. Greeting + workspace come from the auth store. */
const authStore = useAuthStore()

const firstName = computed(() => (authStore.userFullName || 'there').split(' ')[0])

const stats = [
  { label: 'Active jobs', value: '12', suffix: '', trend: { dir: 'up', value: '+2' }, foot: '3 closing this week', footDot: true },
  { label: 'Total applications', value: '284', suffix: '', trend: { dir: 'up', value: '+18%' }, foot: 'vs. last 30 days' },
  { label: 'Avg AI score', value: '78', suffix: '/100', trend: { dir: 'up', value: '+4' }, foot: 'across all open roles' },
  { label: 'Time to hire', value: '14', suffix: ' days', trend: { dir: 'down', value: '-2d' }, foot: 'median, last quarter' },
]

const candidates = [
  { name: 'Sarah Chen', email: 'sarah.chen@hey.com', role: 'Senior Backend Engineer', loc: 'Austin, TX', score: 92, stage: 'Interview', date: 'Today, 9:14 AM' },
  { name: 'Marcus Johnson', email: 'mjohnson@gmail.com', role: 'Product Designer', loc: 'Remote · USA', score: 88, stage: 'Screened', date: 'Today, 8:02 AM' },
  { name: 'Priya Sharma', email: 'priya@gmail.com', role: 'Senior Backend Engineer', loc: 'Toronto, ON', score: 84, stage: 'Interview', date: 'Yesterday' },
  { name: 'Daniel Kim', email: 'dkim@outlook.com', role: 'Data Scientist', loc: 'Seattle, WA', score: 79, stage: 'Applied', date: 'Yesterday' },
  { name: 'Eleanor Brooks', email: 'eleanor.b@gmail.com', role: 'Product Designer', loc: 'New York, NY', score: 76, stage: 'Screened', date: '2 days ago' },
  { name: 'Andre Williams', email: 'andre.w@hey.com', role: 'Senior Backend Engineer', loc: 'Remote · Canada', score: 71, stage: 'Applied', date: '2 days ago' },
]

const pipeline = [
  { name: 'Applied', count: 142, pct: 100 },
  { name: 'Screened', count: 68, pct: 48 },
  { name: 'Interview', count: 24, pct: 17 },
  { name: 'Offer', count: 6, pct: 4 },
  { name: 'Hired', count: 3, pct: 2 },
]

const suggestions = [
  { t: 'Schedule interview with Sarah Chen', s: '92% fit · Senior Backend' },
  { t: '3 candidates match new Staff PM role', s: 'Open the job to invite them' },
  { t: 'Marcus Johnson hasn’t heard back in 5 days', s: 'Send update template' },
]

const appColumns: Column[] = [
  { key: 'name', title: 'Candidate', type: 'avatar', subField: 'email' },
  { key: 'role', title: 'Job', type: 'twoLine', subField: 'loc' },
  { key: 'score', title: 'AI fit', type: 'score' },
  { key: 'stage', title: 'Stage', type: 'stage' },
  { key: 'date', title: 'Applied', type: 'muted' },
  { key: 'actions', title: '', type: 'action', actionLabel: 'Review', width: 110, align: 'end' },
]

// "Applications · last 7 days" line chart, ported from the mockup SVG.
const chart = (() => {
  const data = [12, 18, 14, 22, 28, 19, 34]
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const W = 420, H = 170, P = { l: 28, r: 12, t: 14, b: 26 }
  const max = 40
  const xStep = (W - P.l - P.r) / (data.length - 1)
  const yFor = (v: number) => P.t + (H - P.t - P.b) * (1 - v / max)
  const pts = data.map((v, i) => [P.l + i * xStep, yFor(v)] as const)
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  const area = `${path} L${last[0]},${H - P.b} L${first[0]},${H - P.b} Z`
  const grid = [0, 10, 20, 30, 40].map((t) => ({ t, y: yFor(t) }))
  return { data, labels, W, H, P, max, path, area, pts, grid, yFor, last }
})()
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
</style>
