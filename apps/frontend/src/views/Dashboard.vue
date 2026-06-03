<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
</script>

<template>
  <AppLayout>
    <div class="dash-page">
      <div class="dash-card">
        <div class="dash-greeting">
          <h1 class="dash-h1">Welcome, {{ authStore.userFullName }} 👋</h1>
          <p class="dash-company">{{ authStore.companyName }}</p>
        </div>

        <div class="dash-body">
          <p class="dash-hint">
            Your dashboard is coming soon. We're building the jobs, pipeline, and analytics views next.
          </p>
          <button class="btn-signout" @click="authStore.signout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.dash-page {
  min-height: calc(100dvh - 56px);
  background: #F9FAFB;
  display: flex;
  align-items: flex-start;
  padding: 48px 40px;
  font-family: 'Inter', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.dash-card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 1px 3px rgba(17,24,39,0.06), 0 1px 2px rgba(17,24,39,0.04);
}

.dash-greeting { display: flex; flex-direction: column; gap: 4px; }

.dash-h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #111827;
}

.dash-company {
  margin: 0;
  font-size: 14px;
  color: #6B7280;
}

.dash-body { display: flex; flex-direction: column; gap: 20px; }

.dash-hint {
  margin: 0;
  font-size: 14px;
  color: #6B7280;
  line-height: 1.6;
  padding: 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}

.btn-signout {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  background: white;
  font: 500 13.5px 'Inter', sans-serif;
  color: #374151;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.15s;
}
.btn-signout:hover { background: #F9FAFB; }
</style>
