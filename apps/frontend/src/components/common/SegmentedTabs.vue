<template>
  <!-- Segmented single-select. Vuetify v-btn-toggle gives mandatory selection,
       keyboard nav and ARIA for free; scoped CSS paints it as the mockup's
       .hf-tab-row pill. Generic over the option value (jobType, filters, etc.). -->
  <v-btn-toggle v-model="model" class="seg" mandatory variant="text">
    <v-btn v-for="opt in options" :key="String(opt.value)" :value="opt.value" class="seg-btn">
      {{ opt.label }}
    </v-btn>
  </v-btn-toggle>
</template>

<script setup lang="ts" generic="T extends string">
defineProps<{ options: readonly { label: string; value: T }[] }>()
const model = defineModel<T>({ required: true })
</script>

<style scoped>
/* track */
.seg {
  display: flex;
  width: 100%;
  height: 44px;
  padding: 4px;
  gap: 4px;
  border: 1px solid var(--hf-border);
  border-radius: 9px;
  /* background: var(--hf-bg); */
}

/* segments — fill the track, strip Vuetify's button chrome */
.seg :deep(.v-btn) {
  flex: 1;
  min-width: 0;
  height: 100% !important;
  border: 0 !important;
  border-radius: 7px !important;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
  color: var(--hf-text-muted);
  background: transparent;
  transition: all 0.15s ease;
}
.seg :deep(.v-btn__overlay) {
  display: none; /* kill Vuetify's grey hover/active wash */
}
.seg :deep(.v-btn:hover) {
  color: var(--hf-text);
}
.seg :deep(.v-btn--active) {
  color: var(--hf-primary);
  font-weight: 600;
  background: var(--hf-surface-dark);
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.08);
}
</style>
