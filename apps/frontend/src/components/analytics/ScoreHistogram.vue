<template>
  <svg :width="W" :height="H" class="histogram">
    <!-- gridlines + y labels -->
    <g v-for="t in ticks" :key="t">
      <line
        :x1="P.l"
        :x2="W - P.r"
        :y1="yOf(t)"
        :y2="yOf(t)"
        stroke="#F3F4F6"
        :stroke-dasharray="t === 0 ? '' : '3 3'"
      />
      <text :x="P.l - 6" :y="yOf(t) + 3" font-size="10" text-anchor="end" fill="#9CA3AF" class="mono">
        {{ t }}
      </text>
    </g>
    <!-- bars -->
    <g v-for="(b, i) in bins" :key="b.range">
      <rect
        :x="barX(i)"
        :y="H - P.b - barH(b.n)"
        :width="bw - 6"
        :height="barH(b.n)"
        rx="3"
        :fill="binColor(b.range)"
        :opacity="parseInt(b.range) >= 70 ? 1 : 0.55"
      />
      <text :x="barX(i) + (bw - 6) / 2" :y="H - 10" font-size="10" text-anchor="middle" fill="#9CA3AF" class="mono">
        {{ b.range }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScoreHistogramBin } from '@/types/analytics'

const props = defineProps<{ bins: ScoreHistogramBin[] }>()

const bins = computed(() => props.bins.map((b) => ({ range: b.range, n: b.count })))

const W = 540
const H = 200
const P = { l: 24, r: 12, t: 12, b: 28 }
// Round the top gridline up to the next 100 so real (usually much smaller
// than the old mock's 300) counts don't get squashed into a sliver.
const max = computed(() => {
  const peak = Math.max(1, ...bins.value.map((b) => b.n))
  return Math.ceil(peak / 100) * 100 || 100
})
const ticks = computed(() => {
  const step = max.value / 3
  return [0, Math.round(step), Math.round(step * 2), max.value]
})
const bw = (W - P.l - P.r) / 10 // always 10 buckets

const yOf = (t: number) => P.t + (H - P.t - P.b) * (1 - t / max.value)
const barX = (i: number) => P.l + i * bw + 3
const barH = (n: number) => (H - P.t - P.b) * (n / max.value)

function binColor(range: string): string {
  const lo = parseInt(range)
  return lo >= 80 ? '#10B981' : lo >= 60 ? '#F59E0B' : lo >= 40 ? '#94A3B8' : '#EF4444'
}
</script>

<style scoped>
.histogram { max-width: 100%; height: auto; }
.mono { font-family: var(--hf-mono); }
</style>
