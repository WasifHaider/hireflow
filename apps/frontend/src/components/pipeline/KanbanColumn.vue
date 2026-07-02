<template>
  <div class="hf-col" :class="stage.toLowerCase()">
    <div class="hf-col-head">
      <div class="hf-col-name">{{ label }}</div>
      <div class="hf-col-count">{{ cards.length }}</div>
    </div>
    <draggable
      :list="cards"
      group="pipeline"
      item-key="id"
      :animation="150"
      ghost-class="dragging"
      class="hf-col-drop"
      @change="onChange"
    >
      <template #item="{ element }">
        <KanbanCard :card="element" @open="$emit('open', $event)" />
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import KanbanCard from '@/components/pipeline/KanbanCard.vue'
import { STAGE_LABELS } from '@/types/pipeline'
import type { PipelineCard, PipelineStage } from '@/types/pipeline'

const props = defineProps<{ stage: PipelineStage; cards: PipelineCard[] }>()
const emit = defineEmits<{
  open: [id: string]
  moved: [payload: { id: string; name: string; fromStage: PipelineStage; toStage: PipelineStage }]
}>()

const label = computed(() => STAGE_LABELS[props.stage])

interface AddedEvent {
  added?: { element: PipelineCard }
}
function onChange(evt: AddedEvent) {
  // Only the destination column fires `added`; that's where we persist.
  if (!evt.added) return
  const card = evt.added.element
  if (card.currentStage === props.stage) return
  emit('moved', {
    id: card.id,
    name: card.candidate.fullName,
    fromStage: card.currentStage,
    toStage: props.stage,
  })
}
</script>

<style scoped>
.hf-col-drop { display: flex; flex-direction: column; gap: 8px; min-height: 40px; }
</style>
