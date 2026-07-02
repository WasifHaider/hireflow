<template>
  <!-- App bar: brand, workspace, search, actions. Vuetify v-app-bar restyled
       with hf tokens so it matches the mockup but stays a real Vuetify layout. -->
  <v-app-bar class="hf-bar" :height="56" flat border>
    <!-- <v-btn class="hf-icon-btn" variant="text" :ripple="false" @click="rail = !rail">
      <HfIcon name="menu" :size="18" />
    </v-btn> -->

    <AppBarLogo to="/dashboard" />

    <div class="hf-workspace-pill ml-3">
      <div class="hf-workspace-dot">{{ workspaceInitial }}</div>
      {{ authStore.companyName || 'Workspace' }}
      <HfIcon name="chevron" :size="14" />
    </div>

    <v-text-field
      class="hf-search-field ml-4"
      density="compact"
      variant="solo"
      flat
      hide-details
      single-line
      placeholder="Search candidates, jobs, notes…"
    >
      <template #prepend-inner><HfIcon name="search" :size="14" /></template>
      <template #append-inner><span class="hf-kbd">⌘K</span></template>
    </v-text-field>

    <v-spacer />

    <v-btn class="hf-icon-btn" variant="text" :ripple="false">
      <HfIcon name="help" :size="16" />
    </v-btn>
    <v-btn class="hf-icon-btn mr-1" variant="text" :ripple="false">
      <HfIcon name="bell" :size="17" />
      <span class="hf-bell-dot" />
    </v-btn>
    <UserMenu :initials="initials" @signout="authStore.signout()" />
  </v-app-bar>

  <!-- Collapsible sidebar. `rail` toggles between full (232px) and icon rail. -->
  <v-navigation-drawer
    class="hf-drawer"
    :rail="rail"
    :width="232"
    :rail-width="64"
    permanent
    border
  >
    <v-list class="hf-nav-list" nav density="comfortable" color="primary">
      <v-list-subheader v-if="!rail">Workspace</v-list-subheader>
      <v-list-item v-for="it in navItems" :key="it.name" :to="it.to" :title="it.name" rounded="lg">
        <template #prepend><HfIcon :name="it.icon" :size="16" /></template>
        <template v-if="!rail && it.count !== undefined" #append>
          <span class="hf-count">{{ it.count }}</span>
        </template>
      </v-list-item>
    </v-list>

    <template #append>
      <v-list class="hf-nav-list" nav density="comfortable">
        <v-list-item title="Settings" rounded="lg">
          <template #prepend><HfIcon name="settings" :size="16" /></template>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>

  <!-- Main column: child route renders here; mounts once, persists across nav. -->
  <v-main>
    <div class="hf-main">
      <RouterView />
    </div>
  </v-main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import HfIcon from '@/components/common/HfIcon.vue'
import AppBarLogo from '@/components/common/AppBarLogo.vue'
import UserMenu from '@/components/common/UserMenu.vue'

/* Recruiter app chrome (top bar + collapsible sidebar). Sits as the parent
   route; children render through <RouterView/> so the shell mounts once and
   survives page-to-page navigation. Nav items without a `to` are inert until
   their screens are built. */
const authStore = useAuthStore()

// Sidebar collapse state. true → icon-only rail.
const rail = ref(false)

const initials = computed(() =>
  (authStore.userFullName || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)
const workspaceInitial = computed(() => (authStore.companyName || 'A').charAt(0).toUpperCase())

const navItems: { name: string; icon: string; to?: string; count?: number }[] = [
  { name: 'Dashboard', icon: 'layout', to: '/dashboard' },
  { name: 'Jobs', icon: 'briefcase', count: 12, to: '/jobs' },
  { name: 'Candidates', icon: 'users', count: 284, to: '/candidates' },
  { name: 'Pipeline', icon: 'columns', to: '/pipeline' },
  // { name: 'Analytics', icon: 'chart', to: '/analytics' },
]
</script>

<style scoped>
/* Bar restyled to the mockup; kill v-btn uppercase + overlay wash. */
.hf-bar :deep(.v-toolbar__content) {
  padding: 0 16px;
  gap: 4px;
}
.hf-icon-btn.v-btn {
  width: 34px;
  height: 34px;
  min-width: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--hf-text-muted);
}
.hf-icon-btn.v-btn:hover {
  background: var(--hf-bg);
  color: var(--hf-text);
}
.hf-bell-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hf-danger);
  border: 1.5px solid white;
}
:deep(.v-btn__overlay) {
  background: transparent;
}

/* Search field shrunk to the mockup pill. */
.hf-search-field {
  max-width: 420px;
}
.hf-search-field :deep(.v-field) {
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: 8px;
  font-size: 13px;
  min-height: 34px;
}
.hf-search-field :deep(.v-field__input) {
  min-height: 34px;
  padding-top: 0;
  padding-bottom: 0;
}
.hf-kbd {
  font: 600 11px var(--hf-mono);
  padding: 2px 5px;
  border-radius: 4px;
  background: white;
  border: 1px solid var(--hf-border);
  color: var(--hf-text-muted);
}

/* Sidebar list to hf tokens. */
.hf-nav-list {
  font-size: 13.5px;
}
/* Custom icon in #prepend collapses Vuetify's prepend spacer — re-add gap. */
.hf-nav-list :deep(.v-list-item__prepend > .v-list-item__spacer) {
  width: 12px;
}
.hf-nav-list :deep(.v-list-subheader) {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--hf-text-subtle);
  min-height: 32px;
}
.hf-count {
  font-size: 11px;
  color: var(--hf-text-subtle);
  font-variant-numeric: tabular-nums;
}
.pin-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.hf-main {
  padding: 28px 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
</style>
