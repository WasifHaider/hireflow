<template>
  <div class="donut">
    <svg width="120" height="120">
      <circle cx="60" cy="60" :r="R" fill="none" stroke="#F3F4F6" :stroke-width="SW" />
      <circle
        v-for="seg in segments"
        :key="seg.name"
        cx="60"
        cy="60"
        :r="R"
        fill="none"
        :stroke="seg.color"
        :stroke-width="SW"
        :stroke-dasharray="`${seg.len} ${circ}`"
        :stroke-dashoffset="-seg.off"
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="60" font-size="20" font-weight="600" text-anchor="middle" dominant-baseline="central" class="donut-total">
        1.2k
      </text>
      <text x="60" y="76" font-size="9" text-anchor="middle" fill="#9CA3AF" letter-spacing="0.08em" font-weight="600">
        SOURCES
      </text>
    </svg>
    <div class="legend">
      <div v-for="d in data" :key="d.name" class="legend-row">
        <span class="legend-dot" :style="{ background: d.color }" />
        <span style="flex: 1">{{ d.name }}</span>
        <span class="legend-pct">{{ d.pct }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// MOCK — applicant sources from the design mockup.
const data = [
  { name: 'LinkedIn', pct: 38, color: '#0A66C2' },
  { name: 'Referral', pct: 24, color: '#10B981' },
  { name: 'Direct', pct: 18, color: '#4F46E5' },
  { name: 'Indeed', pct: 12, color: '#F59E0B' },
  { name: 'Other', pct: 8, color: '#94A3B8' },
]

const R = 38
const SW = 16
const circ = 2 * Math.PI * R

// Pre-compute each arc's length + rotational offset so the segments chain round.
const segments = computed(() => {
  let acc = 0
  return data.map((d) => {
    const seg = { name: d.name, color: d.color, len: circ * (d.pct / 100), off: circ * (acc / 100) }
    acc += d.pct
    return seg
  })
})
</script>

<style scoped>
.donut { display: flex; align-items: center; gap: 22px; }
.donut-total { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.legend { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.legend-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot { width: 8px; height: 8px; border-radius: 2px; }
.legend-pct { font-family: var(--hf-mono); color: var(--hf-text-muted); font-variant-numeric: tabular-nums; }
</style>
