<template>
  <div v-if="stages.length" class="funnel">
    <div v-for="(s, i) in stages" :key="s.name" class="funnel-row">
      <div class="funnel-label">{{ s.name }}</div>
      <div class="funnel-track">
        <div
          class="funnel-bar"
          :style="{ width: barWidth(s.pct) + '%', background: s.color }"
        >
          {{ s.count.toLocaleString() }}
          <span class="funnel-pct">{{ s.pct }}%</span>
        </div>
        <div
          v-if="s.drop != null"
          class="funnel-drop"
          :style="{ left: 'calc(' + barWidth(s.pct) + '% + 12px)' }"
        >
          ↓ {{ Math.abs(s.drop) }}% drop
        </div>
      </div>
      <div class="funnel-from">{{ i === 0 ? 'All sources' : `from ${stages[i - 1]?.name}` }}</div>
    </div>
  </div>
  <div v-else class="hf-muted" style="padding: 24px; text-align: center; font-size: 13px">
    No applications yet.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FunnelStage } from '@/types/analytics'

const props = defineProps<{ funnel: FunnelStage[] }>()

const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  SCREENED: 'Screened',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
}
const STAGE_COLORS: Record<string, string> = {
  APPLIED: '#94A3B8',
  SCREENED: '#60A5FA',
  INTERVIEW: '#A78BFA',
  OFFER: '#F59E0B',
  HIRED: '#10B981',
  REJECTED: '#EF4444',
}
// The funnel only makes sense for the forward pipeline — REJECTED is shown
// elsewhere (pipeline board), not as a funnel stage here.
const FUNNEL_ORDER = ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED']

const stages = computed(() => {
  const base = props.funnel.filter((f) => FUNNEL_ORDER.includes(f.stage))
  const total = base.find((f) => f.stage === 'APPLIED')?.count ?? 0
  if (total === 0) return []
  return FUNNEL_ORDER.map((stage, i) => {
    const count = base.find((f) => f.stage === stage)?.count ?? 0
    const prevCount = i === 0 ? total : (base.find((f) => f.stage === FUNNEL_ORDER[i - 1])?.count ?? 0)
    const pct = Math.round((count / total) * 1000) / 10
    const drop = i === 0 || prevCount === 0 ? null : Math.round(((count - prevCount) / prevCount) * 100)
    return { name: STAGE_LABELS[stage] ?? stage, count, pct, drop, color: STAGE_COLORS[stage] ?? '#94A3B8' }
  })
})

// Floor the bar width so tiny stages stay readable (matches mockup's Math.max(pct, 8)).
function barWidth(pct: number): number {
  return Math.max(pct, 8)
}
</script>

<style scoped>
.funnel { display: flex; flex-direction: column; gap: 14px; }
.funnel-row {
  display: grid;
  grid-template-columns: 110px 1fr 110px;
  gap: 14px;
  align-items: center;
}
.funnel-label { font-size: 13px; font-weight: 500; }
.funnel-track { position: relative; height: 40px; }
.funnel-bar {
  height: 100%;
  border-radius: 7px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  color: white;
  font: 600 12.5px var(--hf-mono);
  font-variant-numeric: tabular-nums;
}
.funnel-pct { margin-left: 8px; opacity: 0.85; font-weight: 500; }
.funnel-drop {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font: 600 11.5px var(--hf-mono);
  color: var(--hf-danger);
  white-space: nowrap;
}
.funnel-from { text-align: right; font-size: 11.5px; color: var(--hf-text-muted); }
</style>
