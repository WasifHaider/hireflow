<template>
  <div class="chart-wrap">
    <Line :data="data" :options="options" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
} from 'chart.js'

// Register only the pieces this chart uses (chart.js is tree-shakeable).
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

const props = withDefaults(
  defineProps<{
    values?: number[]
    labels?: string[]
    max?: number
  }>(),
  {
    values: () => [12, 18, 14, 22, 28, 19, 34],
    labels: () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    max: 40,
  },
)

const PRIMARY = '#4F46E5'

const data = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      borderColor: PRIMARY,
      borderWidth: 2,
      tension: 0.35,
      fill: true,
      // Vertical gradient under the line — needs the live canvas ctx.
      backgroundColor: (ctx: ScriptableContext<'line'>) => {
        const { chartArea, ctx: c } = ctx.chart
        if (!chartArea) return 'transparent'
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        g.addColorStop(0, 'rgba(79,70,229,0.18)')
        g.addColorStop(1, 'rgba(79,70,229,0)')
        return g
      },
      pointBackgroundColor: 'white',
      pointBorderColor: PRIMARY,
      pointBorderWidth: 1.5,
      pointRadius: (ctx) => (ctx.dataIndex === props.values.length - 1 ? 4 : 2.5),
      pointHoverRadius: 5,
    },
  ],
}))

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      padding: 8,
      cornerRadius: 6,
      displayColors: false,
      callbacks: { label: (i) => `${i.parsed.y} apps` },
    },
  },
  scales: {
    y: {
      min: 0,
      max: props.max,
      ticks: {
        stepSize: 10,
        color: '#9CA3AF',
        font: { size: 10, family: 'var(--hf-mono)' },
      },
      grid: { color: '#E5E7EB' },
      border: { dash: [3, 3], display: false },
    },
    x: {
      ticks: { color: '#9CA3AF', font: { size: 10.5 } },
      grid: { display: false },
      border: { display: false },
    },
  },
}))
</script>

<style scoped>
.chart-wrap {
  height: 170px;
  margin-top: 8px;
}
</style>
