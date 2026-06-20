<template>
  <button type="button" class="step" :class="state" @click="$emit('jump')">
    <span class="bubble">
      <HfIcon v-if="state === 'done'" name="check" :size="12" />
      <template v-else>{{ n }}</template>
    </span>
    <span class="step-label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import HfIcon from '@/components/common/HfIcon.vue'

defineProps<{ n: number; label: string; state: 'done' | 'active' | 'todo' }>()
defineEmits<{ jump: [] }>()
</script>

<style scoped>
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
.bubble {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 600;
  border: 1.5px solid var(--hf-border);
  background: var(--hf-surface);
  color: var(--hf-text-muted);
}
.step.active .bubble {
  border-color: var(--hf-primary);
  color: var(--hf-primary);
}
.step.done .bubble {
  border-color: var(--hf-primary);
  background: var(--hf-primary);
  color: #fff;
}
.step-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--hf-text-muted);
}
.step.active .step-label {
  font-weight: 600;
  color: var(--hf-text);
}
.step.done .step-label {
  color: var(--hf-text);
}
</style>
