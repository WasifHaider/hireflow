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
// MOCK — AI score distribution bins from the design mockup.
const bins = [
  { range: '0-9', n: 3 }, { range: '10-19', n: 8 }, { range: '20-29', n: 14 },
  { range: '30-39', n: 28 }, { range: '40-49', n: 62 }, { range: '50-59', n: 118 },
  { range: '60-69', n: 184 }, { range: '70-79', n: 286 }, { range: '80-89', n: 312 },
  { range: '90-100', n: 232 },
]

const W = 540
const H = 200
const P = { l: 24, r: 12, t: 12, b: 28 }
const ticks = [0, 100, 200, 300]
const max = Math.max(...bins.map((b) => b.n))
const bw = (W - P.l - P.r) / bins.length

const yOf = (t: number) => P.t + (H - P.t - P.b) * (1 - t / max)
const barX = (i: number) => P.l + i * bw + 3
const barH = (n: number) => (H - P.t - P.b) * (n / max)

function binColor(range: string): string {
  const lo = parseInt(range)
  return lo >= 80 ? '#10B981' : lo >= 60 ? '#F59E0B' : lo >= 40 ? '#94A3B8' : '#EF4444'
}
</script>

<style scoped>
.histogram { max-width: 100%; height: auto; }
.mono { font-family: var(--hf-mono); }
</style>
