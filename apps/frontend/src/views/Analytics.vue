<template>
  <!-- Content only; chrome lives in RecruiterLayout.
       Wired to real data via GET /analytics/summary. Sources donut and
       time-in-stage/time-to-hire dropped entirely (no backing data yet). -->
  <div class="analytics">
    <!-- Heading -->
    <div class="head-row">
      <div>
        <h1 class="hf-h1">Hiring analytics</h1>
        <div class="hf-muted" style="margin-top: 4px">
          Funnel, AI score distribution, and top jobs across your company
        </div>
      </div>
    </div>

    <div v-if="loading" class="hf-card" style="padding: 32px; text-align: center">
      <span class="hf-muted" style="font-size: 13px">Loading analytics…</span>
    </div>

    <div v-else-if="error" class="hf-card" style="padding: 32px; text-align: center">
      <div class="hf-muted" style="font-size: 13px; margin-bottom: 12px">{{ error }}</div>
      <AppButton variant="ghost" @click="analytics.load()">Retry</AppButton>
    </div>

    <template v-else>
      <!-- KPI strip -->
      <div class="hf-stats">
        <div class="hf-card hf-stat">
          <div class="hf-stat-label">Total applications</div>
          <div class="hf-stat-value">{{ summary?.totalApplications ?? 0 }}</div>
          <div class="hf-stat-foot">all time</div>
        </div>
        <div class="hf-card hf-stat">
          <div class="hf-stat-label">Hired</div>
          <div class="hf-stat-value">{{ summary?.hired ?? 0 }}</div>
          <div class="hf-stat-foot">{{ conversionPct }}% conversion</div>
        </div>
      </div>

      <!-- Funnel -->
      <div class="hf-card section">
        <div class="section-head">
          <h3 class="hf-h2">Conversion funnel</h3>
          <span class="hf-muted" style="margin-left: 10px; font-size: 12px">All jobs</span>
        </div>
        <FunnelChart :funnel="summary?.funnel ?? []" />
      </div>

      <!-- Distribution -->
      <div class="hf-card section">
        <div class="section-head">
          <h3 class="hf-h2">AI score distribution</h3>
          <span class="hf-muted" style="margin-left: 8px; font-size: 12px">{{ scoredCount }} scored candidates</span>
        </div>
        <ScoreHistogram :bins="summary?.scoreHistogram ?? []" />
        <div class="hist-legend">
          <span><i style="background: #10b981" />High (80+)</span>
          <span><i style="background: #f59e0b" />Mid (60–79)</span>
          <span><i style="background: #94a3b8" />Low (40–59)</span>
          <span><i style="background: #ef4444" />Below threshold</span>
        </div>
      </div>

      <!-- Top jobs -->
      <div class="hf-card" style="overflow: hidden">
        <div class="hf-card-head">
          <h3 class="hf-h2">Top-performing jobs</h3>
          <span class="hf-muted" style="margin-left: 8px; font-size: 12px">by application volume</span>
        </div>
        <table v-if="summary?.topJobs.length" class="hf-table">
          <thead>
            <tr>
              <th style="padding-left: 20px">Job</th>
              <th>Applications</th>
              <th>Avg AI score</th>
              <th>Hires</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in summary.topJobs" :key="j.id">
              <td style="padding-left: 20px">
                <div style="font-size: 13px; font-weight: 500">{{ j.title }}</div>
                <div class="hf-cand-sub">{{ j.department ?? '—' }}</div>
              </td>
              <td class="mono">{{ j.applicationCount }}</td>
              <td><span class="hf-score" :class="scoreLevel(j.avgScore)">{{ j.avgScore }}</span></td>
              <td class="mono">{{ j.hires }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="hf-muted" style="padding: 32px 20px; text-align: center; font-size: 13px">
          No jobs yet.
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppButton from '@/components/common/AppButton.vue'
import FunnelChart from '@/components/analytics/FunnelChart.vue'
import ScoreHistogram from '@/components/analytics/ScoreHistogram.vue'
import { scoreLevel } from '@/utils/score'
import { useAnalyticsStore } from '@/stores/analytics.store'

const analytics = useAnalyticsStore()
const { summary, loading, error } = storeToRefs(analytics)

onMounted(() => {
  void analytics.load()
})

const conversionPct = computed(() => {
  const total = analytics.summary?.totalApplications ?? 0
  const hired = analytics.summary?.hired ?? 0
  return total > 0 ? Math.round((hired / total) * 1000) / 10 : 0
})

const scoredCount = computed(() =>
  (analytics.summary?.scoreHistogram ?? []).reduce((sum, b) => sum + b.count, 0),
)
</script>

<style scoped>
.analytics { display: flex; flex-direction: column; gap: 20px; }
.head-row { display: flex; align-items: center; }

.section { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.section-head { display: flex; align-items: center; }

.hist-legend { display: flex; gap: 14px; font-size: 11.5px; color: var(--hf-text-muted); }
.hist-legend span { display: inline-flex; align-items: center; gap: 5px; }
.hist-legend i { width: 8px; height: 8px; border-radius: 2px; }

.mono { font-family: var(--hf-mono); font-variant-numeric: tabular-nums; }
</style>
