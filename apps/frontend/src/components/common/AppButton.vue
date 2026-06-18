<template>
  <v-btn
    class="app-btn"
    :class="`app-btn--${variant}`"
    variant="flat"
    :ripple="false"
    flat
    :block="block"
    :loading="loading"
    :disabled="disabled"
    :type="type"
  >
    <!-- consumer supplies label + any leading/trailing icons -->
    <slot />
  </v-btn>
</template>

<script setup lang="ts">
// Shared button — wraps Vuetify's v-btn so every CTA in the app gets the same
// HireFlow styling (no uppercase, no elevation wash) from one place.
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost'
    block?: boolean
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'primary',
    block: false,
    loading: false,
    disabled: false,
    type: 'button',
  },
)
</script>

<style scoped>
.app-btn.v-btn {
  text-transform: none;
  letter-spacing: normal;
  font-family: 'Inter', sans-serif;
}
.app-btn.v-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* overlay is Vuetify's hover/disabled grey wash — kill it, we style states ourselves */
.app-btn.v-btn :deep(.v-btn__overlay) {
  opacity: 0 !important;
}

/* ── Primary (indigo gradient) ───────────────────────────────────────────── */
.app-btn--primary.v-btn {
  height: 44px;
  border-radius: 9px;
  background: linear-gradient(180deg, #4f46e5, #4338ca);
  color: white;
  font-weight: 600;
  font-size: 14px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.15) inset,
    0 1px 2px rgba(79, 70, 229, 0.25);
}
.app-btn--primary.v-btn:hover:not(.v-btn--disabled) {
  opacity: 0.92;
}
.app-btn--primary.v-btn:active:not(.v-btn--disabled) {
  transform: scale(0.99);
}
.app-btn--primary.v-btn.v-btn--disabled {
  opacity: 0.5;
  color: white !important;
}
.app-btn--primary.v-btn :deep(.v-btn__loader) {
  color: white;
}

/* ── Ghost (white + border) ──────────────────────────────────────────────── */
.app-btn--ghost.v-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 7px;
  background: white;
  border: 1px solid #e5e7eb;
  color: #111827;
  font-weight: 500;
  font-size: 13px;
  box-shadow: none;
}
.app-btn--ghost.v-btn:hover:not(.v-btn--disabled) {
  background: #f9fafb;
}
</style>
