<template>
  <!-- Free-entry tag input. v-combobox is Vuetify's built-in chip editor:
       multiple + chips turns typed/Enter'd text into removable chips. -->
  <v-combobox
    v-model="model"
    class="skill-combo"
    :class="{ accent }"
    variant="outlined"
    chips
    closable-chips
    multiple
    hide-details
    :placeholder="model.length ? '' : placeholder"
    persistent-placeholder
    :menu="false"
    :delimiters="[',']"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ accent?: boolean; placeholder?: string }>(),
  { accent: false, placeholder: 'Add skill…' },
)
const model = defineModel<string[]>({ required: true })
</script>

<style scoped>
.skill-combo :deep(.v-field) {
  border-radius: 9px;
  min-height: 44px;
  font-size: 13px;
  --v-field-border-opacity: 1;
  --v-field-padding-start: 14px;
  --v-field-padding-end: 14px;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.skill-combo :deep(.v-field__input) {
  padding-top: 6px;
  padding-bottom: 6px;
  gap: 6px;
}
.skill-combo :deep(.v-field__input::placeholder),
.skill-combo :deep(input::placeholder) {
  color: #9ca3af;
  opacity: 1;
}
/* Chips styled to the mockup's .hf-tag (neutral by default, indigo when accent). */
.skill-combo :deep(.v-chip) {
  height: 26px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: var(--hf-bg);
  color: var(--hf-text-muted);
  border: 1px solid var(--hf-border);
}
.skill-combo.accent :deep(.v-chip) {
  background: var(--hf-primary-soft);
  color: var(--hf-primary);
  border-color: var(--hf-primary-soft-2);
}
.skill-combo :deep(.v-field--variant-outlined .v-field__outline__start),
.skill-combo :deep(.v-field--variant-outlined .v-field__outline__end),
.skill-combo :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.skill-combo :deep(.v-field--variant-outlined .v-field__outline__notch::after) {
  border-color: var(--hf-border);
}
.skill-combo :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px var(--hf-primary-soft);
}
.skill-combo :deep(.v-field--focused .v-field__outline__start),
.skill-combo :deep(.v-field--focused .v-field__outline__end),
.skill-combo :deep(.v-field--focused .v-field__outline__notch::before),
.skill-combo :deep(.v-field--focused .v-field__outline__notch::after) {
  border-color: var(--hf-primary);
}
</style>
