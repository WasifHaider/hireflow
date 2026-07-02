<template>
  <div class="tis">
    <div v-for="d in data" :key="d.name" class="tis-row">
      <div class="tis-label">{{ d.name }}</div>
      <div class="tis-track">
        <div class="tis-bar" :style="{ width: (d.days / MAX) * 100 + '%' }" />
      </div>
      <div class="tis-val">{{ d.days }}d</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// MOCK — average days spent between stages, from the design mockup.
const data = [
  { name: 'Applied → Screened', days: 1.8 },
  { name: 'Screened → Interview', days: 3.2 },
  { name: 'Interview → Offer', days: 6.4 },
  { name: 'Offer → Hired', days: 2.6 },
]
const MAX = 8
</script>

<style scoped>
.tis { display: flex; flex-direction: column; gap: 12px; }
.tis-row { display: grid; grid-template-columns: 160px 1fr 60px; align-items: center; gap: 12px; }
.tis-label { font-size: 12.5px; color: var(--hf-text-muted); }
.tis-track { height: 22px; background: var(--hf-bg); border-radius: 5px; overflow: hidden; }
.tis-bar { height: 100%; border-radius: 5px; background: linear-gradient(90deg, #4f46e5, #6366f1); }
.tis-val {
  font: 12px var(--hf-mono);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
