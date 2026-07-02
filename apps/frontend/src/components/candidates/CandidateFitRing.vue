<template>
  <div class="fit-ring">
    <div v-if="score != null" class="hf-ring" :style="ringStyle">
      <div class="hf-ring-inner">
        <div class="hf-ring-num">{{ score }}</div>
        <div class="hf-ring-lbl">AI fit</div>
      </div>
    </div>
    <div v-else class="ring-empty">Not scored yet</div>
    <div v-if="model" class="ring-model">Scored by {{ model }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ score: number | null; model?: string }>()
const ringStyle = computed(() => {
  if (props.score == null) return {} as Record<string, string>
  const pct = props.score
  const color = pct >= 80 ? 'var(--hf-accent)' : pct >= 60 ? 'var(--hf-primary)' : 'var(--hf-warn)'
  return { '--pct': String(pct), '--ring-color': color } as Record<string, string>
})
</script>

<style scoped>
.fit-ring { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.ring-empty {
  width: 132px; height: 132px; border-radius: 50%;
  border: 2px dashed var(--hf-border);
  display: grid; place-items: center;
  font-size: 12px; color: var(--hf-text-subtle); text-align: center; padding: 0 16px;
}
.ring-model { font-size: 11px; color: var(--hf-text-subtle); }
</style>
