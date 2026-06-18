<template>
  <v-checkbox
    v-model="model"
    class="app-checkbox"
    color="primary"
    density="compact"
    hide-details
  >
    <template #label>
      <span class="app-checkbox__label"><slot /></span>
    </template>
  </v-checkbox>
</template>

<script setup lang="ts">
// Shared checkbox — Vuetify v-checkbox tuned to the HireFlow look (compact,
// indigo when checked, no reserved details row). Label goes in the default slot
// so callers can embed links (e.g. Terms / Privacy).
const model = defineModel<boolean>({ default: false })
</script>

<style scoped>
.app-checkbox {
  flex: none;
}
.app-checkbox :deep(.v-selection-control) {
  min-height: 0;
}
.app-checkbox :deep(.v-selection-control__wrapper) {
  width: 22px;
  height: 22px;
}
.app-checkbox :deep(.v-icon) {
  font-size: 20px;
}
.app-checkbox__label {
  font-size: 13px;
  color: #374151;
  line-height: 1.45;
}
.app-checkbox :deep(a) {
  color: #4f46e5;
  font-weight: 500;
  text-decoration: none;
}
.app-checkbox :deep(a:hover) {
  text-decoration: underline;
}
</style>
