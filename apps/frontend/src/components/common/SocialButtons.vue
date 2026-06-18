<template>
  <div class="social-stack">
    <div v-for="p in providers" :key="p" class="social-wrap">
      <v-btn class="social-btn" variant="flat" :ripple="false" flat block disabled>
        <!-- Google -->
        <svg v-if="p === 'google'" width="16" height="16" viewBox="0 0 48 48">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.4 39.6 16.1 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.5C41.7 35.8 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z"
          />
        </svg>
        <!-- LinkedIn -->
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
          <path
            d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3v9zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"
          />
        </svg>
        {{ labels[p] }}
      </v-btn>
      <span v-if="soon" class="soon-badge">Soon</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Shared OAuth buttons (Google / LinkedIn). Disabled for now — real OAuth lands
// in a later phase (see /auth/callback route placeholder).
withDefaults(
  defineProps<{
    /** which providers to show, in order */
    providers?: Array<'google' | 'linkedin'>
    /** show a "Soon" badge (recruiter pages use this on the single Google button) */
    soon?: boolean
  }>(),
  {
    providers: () => ['google', 'linkedin'],
    soon: false,
  },
)

const labels: Record<'google' | 'linkedin', string> = {
  google: 'Continue with Google',
  linkedin: 'Continue with LinkedIn',
}
</script>

<style scoped>
.social-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.social-wrap {
  position: relative;
  display: flex;
}
.social-btn.v-btn {
  flex: 1;
  height: 44px;
  border-radius: 9px;
  background: white !important;
  border: 1px solid #e5e7eb;
  color: #111827;
  text-transform: none;
  letter-spacing: normal;
  box-shadow: none;
  font:
    500 13.5px 'Inter',
    sans-serif;
}
.social-btn.v-btn.v-btn--disabled {
  opacity: 0.55;
}
.social-btn.v-btn :deep(.v-btn__overlay) {
  opacity: 0 !important;
}
.social-btn.v-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  gap: 10px;
}
.soon-badge {
  position: absolute;
  top: -8px;
  right: -6px;
  background: #6b7280;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 99px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
