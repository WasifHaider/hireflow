<template>
  <div class="funnel">
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
</template>

<script setup lang="ts">
interface FunnelStage {
  name: string
  count: number
  pct: number
  drop: number | null
  color: string
}

// MOCK — funnel volumes from the design mockup; wired to analytics API later.
const stages: FunnelStage[] = [
  { name: 'Applied', count: 1247, pct: 100, drop: null, color: '#94A3B8' },
  { name: 'Screened', count: 612, pct: 49, drop: -51, color: '#60A5FA' },
  { name: 'Interview', count: 218, pct: 17, drop: -64, color: '#A78BFA' },
  { name: 'Offer', count: 42, pct: 3.4, drop: -81, color: '#F59E0B' },
  { name: 'Hired', count: 28, pct: 2.2, drop: -33, color: '#10B981' },
]

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
