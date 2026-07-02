<template>
  <v-menu :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: act }">
      <button class="hf-btn ghost cols-btn" v-bind="act" aria-label="Columns">
        <HfIcon name="layout" :size="15" />
      </button>
    </template>
    <div class="hf-select-menu cols-pop">
      <label v-for="c in toggleable" :key="c.key" class="row">
        <input type="checkbox" :checked="!modelValue.includes(c.key)" @change="toggle(c.key)" />
        {{ c.label }}
      </label>
    </div>
  </v-menu>
</template>

<script setup lang="ts">
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

// Hideable columns (Candidate is always shown). Checked = visible (NOT in the hidden list).
const toggleable = [
  { key: 'jobTitle', label: 'Applying for' },
  { key: 'aiFitScore', label: 'AI fit' },
  { key: 'currentStage', label: 'Stage' },
]

function toggle(key: string) {
  const next = props.modelValue.includes(key)
    ? props.modelValue.filter((k) => k !== key)
    : [...props.modelValue, key]
  emit('update:modelValue', next)
}
</script>

<style scoped>
.cols-btn {
  width: 34px;
  padding: 0;
  display: grid;
  place-items: center;
}
.cols-pop {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 160px;
  background: var(--hf-surface);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--hf-text);
  cursor: pointer;
}
</style>
