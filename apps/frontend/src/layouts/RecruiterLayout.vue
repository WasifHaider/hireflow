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
      v-model="searchQuery"
      class="hf-search-field ml-4"
      density="compact"
      variant="solo"
      flat
      hide-details
      single-line
      placeholder="Search candidates by name, email, or job…"
      @keyup.enter="runSearch"
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
    <v-btn class="hf-icon-btn mr-1" variant="text" :ripple="false" @click="agentStore.togglePanel()">
      <HfIcon name="sparkles" :size="16" />
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

  <!-- Global toast: job-publish confirmations + "resume scored" pings from the
       background scoring poller. Single instance here so it survives nav
       across every recruiter screen (chrome mounts once). -->
  <v-snackbar v-model="toastStore.open" :timeout="3200" location="bottom right">
    {{ toastStore.text }}
  </v-snackbar>

  <CopilotPanel />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useJobsStore } from '@/stores/jobs.store'
import { useCandidatesStore } from '@/stores/candidates.store'
import { useToastStore } from '@/stores/toast.store'
import { useAgentStore } from '@/stores/agent.store'
import api from '@/plugins/axios'
import type { CandidateListResponse } from '@/types/candidate'
import HfIcon from '@/components/common/HfIcon.vue'
import AppBarLogo from '@/components/common/AppBarLogo.vue'
import UserMenu from '@/components/common/UserMenu.vue'
import CopilotPanel from '@/components/agent/CopilotPanel.vue'

/* Recruiter app chrome (top bar + collapsible sidebar). Sits as the parent
   route; children render through <RouterView/>; so the shell mounts once and
   survives page-to-page navigation. Nav items without a `to` are inert until
   their screens are built. */
const authStore = useAuthStore()
const jobsStore = useJobsStore()
const candidatesStore = useCandidatesStore()
const toastStore = useToastStore()
const agentStore = useAgentStore()
const router = useRouter()

// Top-bar search — navigates to the Candidates list with `q` prefilled.
// (Candidates already supports a name/email search param; jobs/notes search
// isn't backed by any endpoint yet, so this covers the useful subset.)
const searchQuery = ref('')
function runSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  router.push({ path: '/candidates', query: { q } })
}

// Real sidebar counts (were hardcoded before). pageSize:1 keeps the request
// cheap — we only need the `total`/`counts.all` from the response envelope.
const jobsCount = ref<number | null>(null)
const candidatesCount = ref<number | null>(null)

onMounted(async () => {
  try {
    const jobs = await jobsStore.fetchJobs({ pageSize: 1 })
    jobsCount.value = jobs.counts.all
  } catch {
    // Non-critical: sidebar badge just stays blank on failure.
  }
  try {
    const candidates = await candidatesStore.fetchCandidates({ pageSize: 1 })
    candidatesCount.value = candidates.total
  } catch {
    // Non-critical: sidebar badge just stays blank on failure.
  }
})

// ── "Resume scored" toast ────────────────────────────────────────────────────
// There's no WebSocket/SSE infra yet, so this polls the most recent applications
// and diffs aiFitScore against what it saw last poll. An id seen previously with
// a null score that now has a non-null score means the background ML-scoring
// job (application-scoring queue) just finished for it — toast it.
// `knownScores` starts as `undefined` per id (not yet observed) so the very
// first poll after page load never fires toasts for pre-existing scored rows.
const knownScores = new Map<string, number | null>()
let scorePollTimer: ReturnType<typeof setInterval> | undefined
let scorePollInFlight = false

async function pollForScoredApplications() {
  if (scorePollInFlight) return
  scorePollInFlight = true
  try {
    const { data } = await api.get<CandidateListResponse>('/applications', {
      params: { pageSize: 10, sortBy: 'appliedAt', sortOrder: 'desc' },
    })
    for (const app of data.data) {
      const previous = knownScores.get(app.id)
      if (previous === null && app.aiFitScore !== null) {
        toastStore.show(`${app.candidate.fullName}'s resume was scored: ${app.aiFitScore}/100 fit`)
      }
      knownScores.set(app.id, app.aiFitScore)
    }
  } catch {
    // Non-critical: silently skip this tick, retry on the next interval.
  } finally {
    scorePollInFlight = false
  }
}

const SCORE_POLL_INTERVAL_MS = 8000
onMounted(() => {
  void pollForScoredApplications()
  scorePollTimer = setInterval(() => void pollForScoredApplications(), SCORE_POLL_INTERVAL_MS)
})
onBeforeUnmount(() => {
  if (scorePollTimer) clearInterval(scorePollTimer)
})

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

const navItems = computed<{ name: string; icon: string; to?: string; count?: number }[]>(() => [
  { name: 'Dashboard', icon: 'layout', to: '/dashboard' },
  { name: 'Jobs', icon: 'briefcase', count: jobsCount.value ?? undefined, to: '/jobs' },
  { name: 'Candidates', icon: 'users', count: candidatesCount.value ?? undefined, to: '/candidates' },
  { name: 'Pipeline', icon: 'columns', to: '/pipeline' },
  // { name: 'Analytics', icon: 'chart', to: '/analytics' },
])
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
