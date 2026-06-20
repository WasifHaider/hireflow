<template>
  <section class="hf-card step-card">
    <div>
      <h3 class="hf-h2">Pipeline stages</h3>
      <div class="hf-muted sub">
        Every job uses HireFlow's standard pipeline. The AI screen runs on the first stage.
      </div>
    </div>

    <div class="stages">
      <div v-for="(s, i) in stages" :key="s.name" class="stage-row">
        <div class="num" :style="{ background: s.color + '22', color: s.color }">{{ i + 1 }}</div>
        <div class="stage-main">
          <div class="stage-name">
            {{ s.name }}
            <span v-if="s.auto" class="hf-tag accent ai-tag">
              <HfIcon name="sparkles" :size="10" />AI
            </span>
          </div>
          <div class="hf-cand-sub">{{ s.desc }}</div>
        </div>
      </div>
    </div>

    <div class="note">
      <HfIcon name="settings" :size="13" />
      Custom stages (rename, reorder, add) are coming in a later update.
    </div>
  </section>
</template>

<script setup lang="ts">
import HfIcon from '@/components/common/HfIcon.vue'
import { FIXED_PIPELINE_STAGES } from '@/types/job'

const stages = FIXED_PIPELINE_STAGES
</script>

<style scoped>
.step-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sub {
  margin-top: 2px;
  font-size: 12.5px;
}
.stages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stage-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--hf-border);
  border-radius: 9px;
  background: var(--hf-surface);
}
.num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font: 700 11px var(--hf-mono);
}
.stage-main {
  flex: 1;
}
.stage-name {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-tag {
  height: 16px;
  padding: 0 5px;
  font-size: 10px;
  gap: 3px;
  display: inline-flex;
  align-items: center;
}
.note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--hf-text-muted);
  padding: 10px 12px;
  background: var(--hf-bg);
  border-radius: 8px;
}
</style>
