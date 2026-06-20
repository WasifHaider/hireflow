<template>
  <div class="hf-card stepper">
    <template v-for="(s, i) in steps" :key="s.n">
      <StepBubble
        :n="s.n"
        :label="s.label"
        :state="stateFor(s.n)"
        @jump="$emit('jump', s.n)"
      />
      <div v-if="i < steps.length - 1" class="connector" :class="{ filled: s.n < current }" />
    </template>
  </div>
</template>

<script setup lang="ts">
import StepBubble from './StepBubble.vue'

const props = defineProps<{ current: number }>()
defineEmits<{ jump: [step: number] }>()

const steps = [
  { n: 1, label: 'Job details' },
  { n: 2, label: 'Requirements' },
  { n: 3, label: 'Pipeline stages' },
  { n: 4, label: 'Review & publish' },
]

function stateFor(n: number): 'done' | 'active' | 'todo' {
  if (n < props.current) return 'done'
  if (n === props.current) return 'active'
  return 'todo'
}
</script>

<style scoped>
.stepper {
  padding: 14px 22px;
  display: flex;
  align-items: center;
  gap: 28px;
}
.connector {
  flex: 1;
  height: 1.5px;
  background: var(--hf-border);
}
.connector.filled {
  background: var(--hf-primary);
}
</style>
