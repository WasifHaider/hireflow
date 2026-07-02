<template>
  <div class="hf-timeline">
    <div class="hf-tl-item">
      <div class="hf-tl-dot done"><HfIcon name="check" :size="11" /></div>
      <div>
        <div class="hf-tl-title">Applied</div>
        <div class="hf-tl-sub">{{ appliedLabel }}</div>
      </div>
    </div>
    <div class="hf-tl-item">
      <div class="hf-tl-dot current" />
      <div>
        <div class="hf-tl-title">Current stage</div>
        <div class="hf-tl-sub">{{ STAGE_LABELS[currentStage] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'
import type { ApplicationStage } from '@/types/candidate'
import { STAGE_LABELS } from '@/types/candidate'
const props = defineProps<{ appliedAt: string; currentStage: ApplicationStage }>()
const appliedLabel = computed(() =>
  new Date(props.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
)
</script>
