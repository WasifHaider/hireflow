<template>
  <!-- Content only; chrome lives in RecruiterLayout.
       FRONTEND-ONLY: every chart is mock-data driven; analytics API wired later. -->
  <div class="analytics">
    <!-- Heading + filters -->
    <div class="head-row">
      <div>
        <h1 class="hf-h1">Hiring analytics</h1>
        <div class="hf-muted" style="margin-top: 4px">
          Funnel, sources, and time-in-stage for all open jobs
        </div>
      </div>
      <div class="head-actions">
        <AppButton variant="ghost"><HfIcon name="briefcase" :size="14" />All jobs<HfIcon name="chevron" :size="14" /></AppButton>
        <AppButton variant="ghost"><HfIcon name="cal" :size="14" />Apr 16 – May 15, 2026<HfIcon name="chevron" :size="14" /></AppButton>
        <AppButton variant="ghost"><HfIcon name="download" :size="14" />Export</AppButton>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="hf-stats">
      <div v-for="k in kpis" :key="k.label" class="hf-card hf-stat">
        <div class="hf-stat-label">{{ k.label }}</div>
        <div class="hf-stat-value">
          {{ k.value }}<span v-if="k.unit" class="kpi-unit">{{ k.unit }}</span>
          <span class="hf-trend" :class="k.dir"><HfIcon :name="k.dir === 'up' ? 'arrowUp' : 'arrowDown'" :size="11" />{{ k.delta }}</span>
        </div>
        <div class="hf-stat-foot">{{ k.foot }}</div>
      </div>
    </div>

    <!-- Funnel -->
    <div class="hf-card section">
      <div class="section-head">
        <h3 class="hf-h2">Conversion funnel</h3>
        <span class="hf-muted" style="margin-left: 10px; font-size: 12px">All jobs · Apr 16 – May 15</span>
        <div class="hf-tab-row" style="margin-left: auto">
          <div class="tab active">Volume</div>
          <div class="tab">Rates</div>
        </div>
      </div>
      <FunnelChart />
    </div>

    <!-- Distribution + sources -->
    <div class="two-col">
      <div class="hf-card section">
        <div class="section-head">
          <h3 class="hf-h2">AI score distribution</h3>
          <span class="hf-muted" style="margin-left: 8px; font-size: 12px">1,247 candidates</span>
          <span class="hf-tag accent" style="margin-left: 10px">Median 76</span>
        </div>
        <ScoreHistogram />
        <div class="hist-legend">
          <span><i style="background: #10b981" />High (80+)</span>
          <span><i style="background: #f59e0b" />Mid (60–79)</span>
          <span><i style="background: #94a3b8" />Low (40–59)</span>
          <span><i style="background: #ef4444" />Below threshold</span>
        </div>
      </div>

      <div class="hf-card section">
        <h3 class="hf-h2">Sources</h3>
        <SourceDonut />
      </div>
    </div>

    <!-- Time in stage -->
    <div class="hf-card section">
      <div class="section-head">
        <h3 class="hf-h2">Average time-in-stage</h3>
        <span class="hf-muted" style="margin-left: 8px; font-size: 12px">Where candidates wait the longest</span>
      </div>
      <TimeInStage />
    </div>

    <!-- Top jobs -->
    <div class="hf-card" style="overflow: hidden">
      <div class="hf-card-head">
        <h3 class="hf-h2">Top-performing jobs</h3>
        <div class="right">
          <div class="hf-tab-row">
            <div class="tab active">By volume</div>
            <div class="tab">By quality</div>
            <div class="tab">By speed</div>
          </div>
        </div>
      </div>
      <table class="hf-table">
        <thead>
          <tr>
            <th style="padding-left: 20px">Job</th>
            <th>Applications</th>
            <th>Avg AI score</th>
            <th>Hires</th>
            <th>Time-to-hire</th>
            <th>Quality index</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="j in topJobs" :key="j.title">
            <td style="padding-left: 20px">
              <div style="font-size: 13px; font-weight: 500">{{ j.title }}</div>
              <div class="hf-cand-sub">{{ j.dept }}</div>
            </td>
            <td class="mono">{{ j.apps }}</td>
            <td><span class="hf-score" :class="scoreLevel(j.score)">{{ j.score }}</span></td>
            <td class="mono">{{ j.hires }}</td>
            <td class="mono">{{ j.days }}d</td>
            <td style="width: 180px">
              <div style="display: flex; align-items: center; gap: 10px">
                <div class="hf-meter accent" style="flex: 1"><span :style="{ width: j.score + '%' }" /></div>
                <span class="mono" style="font-size: 11; color: var(--hf-text-muted)">{{ j.score }}/100</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import HfIcon from '@/components/common/HfIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import FunnelChart from '@/components/analytics/FunnelChart.vue'
import ScoreHistogram from '@/components/analytics/ScoreHistogram.vue'
import TimeInStage from '@/components/analytics/TimeInStage.vue'
import SourceDonut from '@/components/analytics/SourceDonut.vue'
import { scoreLevel } from '@/utils/score'

// MOCK — all figures from the design mockup until the analytics API is wired.
const kpis = [
  { label: 'Total applications', value: '1,247', unit: '', delta: '+18%', dir: 'up', foot: 'vs. previous 30 days' },
  { label: 'Hired', value: '28', unit: '', delta: '+6', dir: 'up', foot: '2.2% conversion' },
  { label: 'Avg time to hire', value: '14', unit: ' days', delta: '-2d', dir: 'down', foot: 'median across all jobs' },
  { label: 'AI screen accuracy', value: '94', unit: '%', delta: '+2pp', dir: 'up', foot: 'vs. recruiter agreement' },
] as const

const topJobs = [
  { title: 'Senior Backend Engineer', dept: 'Engineering', apps: 284, score: 81, hires: 4, days: 18 },
  { title: 'Product Designer', dept: 'Design', apps: 196, score: 78, hires: 2, days: 22 },
  { title: 'Data Scientist', dept: 'Data', apps: 142, score: 76, hires: 3, days: 14 },
  { title: 'Frontend Engineer', dept: 'Engineering', apps: 218, score: 73, hires: 5, days: 12 },
  { title: 'Staff PM, Platform', dept: 'Product', apps: 94, score: 82, hires: 1, days: 28 },
]
</script>

<style scoped>
.analytics { display: flex; flex-direction: column; gap: 20px; }
.head-row { display: flex; align-items: center; }
.head-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.kpi-unit { font-size: 16px; color: var(--hf-text-muted); font-weight: 500; }

.section { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.section-head { display: flex; align-items: center; }
.two-col { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }

.hist-legend { display: flex; gap: 14px; font-size: 11.5px; color: var(--hf-text-muted); }
.hist-legend span { display: inline-flex; align-items: center; gap: 5px; }
.hist-legend i { width: 8px; height: 8px; border-radius: 2px; }

.mono { font-family: var(--hf-mono); font-variant-numeric: tabular-nums; }
</style>
