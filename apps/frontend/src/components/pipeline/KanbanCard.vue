<template>
  <div class="hf-kcard" :class="{ dragging }" @click="$emit('open', card.id)">
    <div class="hf-kcard-top">
      <Avatar :name="card.candidate.fullName" />
      <div style="flex: 1; min-width: 0">
        <div class="hf-kcard-name">{{ card.candidate.fullName }}</div>
        <div class="hf-kcard-role">{{ card.candidate.email }}</div>
      </div>
      <span v-if="card.aiFitScore != null" class="hf-score" :class="scoreLevel(card.aiFitScore)">
        {{ card.aiFitScore }}
      </span>
      <span v-else class="hf-score" style="opacity: 0.5">—</span>
    </div>

    <div class="hf-kcard-foot">
      <HfIcon name="clock" :size="12" />
      <span>{{ relativeAge(card.appliedAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/common/Avatar.vue'
import HfIcon from '@/components/common/HfIcon.vue'
import { scoreLevel } from '@/utils/score'
import { relativeAge } from '@/utils/date'
import type { PipelineCard } from '@/types/pipeline'

defineProps<{ card: PipelineCard; dragging?: boolean }>()
defineEmits<{ open: [id: string] }>()
</script>
