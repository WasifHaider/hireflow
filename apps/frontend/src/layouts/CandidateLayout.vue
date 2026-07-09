<template>
  <!-- Candidate app bar: warmer, no sidebar, nav tabs inline. -->
  <v-app-bar class="cand-bar" :height="64" flat border>
    <AppBarLogo class="ml-4" />

    <nav class="cand-nav ml-8">
      <template v-for="tab in navTabs" :key="tab.label">
        <v-btn
          v-if="tab.to"
          class="cand-nav-item"
          :class="{ active: isActive(tab) }"
          variant="text"
          :ripple="false"
          :to="tab.to"
        >
          {{ tab.label }}
          <span v-if="tab.badge && applicationCount" class="cand-nav-count">{{ applicationCount }}</span>
        </v-btn>
        <!-- Not yet backed by an API — shown for parity with the design, disabled. -->
        <v-tooltip v-else text="Coming soon" location="bottom">
          <template #activator="{ props: tip }">
            <span v-bind="tip" class="cand-nav-item soon">
              {{ tab.label }}<span class="soon-dot">Soon</span>
            </span>
          </template>
        </v-tooltip>
      </template>
    </nav>

    <v-spacer />

    <v-btn class="hf-icon-btn mr-1" variant="text" :ripple="false">
      <HfIcon name="bell" :size="17" />
      <span class="hf-bell-dot" />
    </v-btn>
    <UserMenu :initials="avatarInitial" :name="firstName" @signout="signOut" />
  </v-app-bar>

  <v-main>
    <!-- Soft gradient backdrop owned by the layout; child route fills cand-main. -->
    <div class="cand-bg">
      <div class="cand-main">
        <RouterView />
      </div>
    </div>
  </v-main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCandidateAuthStore } from '@/stores/candidateAuth.store'
import { useCandidateApplicationsStore } from '@/stores/candidateApplications.store'
import HfIcon from '@/components/common/HfIcon.vue'
import AppBarLogo from '@/components/common/AppBarLogo.vue'
import UserMenu from '@/components/common/UserMenu.vue'

/* Candidate app chrome. Sidebar-less, lighter than the recruiter shell, per the
   mockup. Parent route; the dashboard renders through <RouterView/>. */
const router = useRouter()
const route = useRoute()
const candidateAuth = useCandidateAuthStore()
const { applications } = storeToRefs(useCandidateApplicationsStore())

const firstName = computed(() => (candidateAuth.candidateName || 'there').split(' ')[0])
const avatarInitial = computed(() => (candidateAuth.candidateName || 'U').charAt(0).toUpperCase())
const applicationCount = computed(() => applications.value.length)

// "Saved" awaits a backend table; the rest are wired. `activeNames` lets a tab
// stay highlighted on its detail sub-routes (e.g. Browse Jobs → job detail).
interface NavTab {
  label: string
  to?: string
  badge?: boolean
  activeNames?: string[]
}
const navTabs: NavTab[] = [
  { label: 'My Applications', to: '/candidate/dashboard', badge: true, activeNames: ['candidate-dashboard'] },
  { label: 'Browse Jobs', to: '/candidate/jobs', activeNames: ['candidate-jobs', 'candidate-job-detail'] },
  { label: 'Saved' },
  { label: 'Profile', to: '/candidate/profile', activeNames: ['candidate-profile'] },
]

function isActive(tab: NavTab): boolean {
  return !!tab.activeNames?.includes(route.name as string)
}

function signOut() {
  candidateAuth.signoutCandidate()
  router.push('/candidate/signin')
}
</script>

<style scoped>
.cand-bar {
  background: white;
}
.cand-bar :deep(.v-toolbar__content) {
  padding: 0 36px;
}
.cand-nav {
  display: flex;
  gap: 4px;
}
.cand-nav-item.v-btn {
  height: 34px;
  min-width: 0;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
  color: var(--hf-text-muted);
}
.cand-nav-item.v-btn.active {
  font-weight: 600;
  color: var(--hf-text);
  background: var(--hf-bg);
}
.cand-nav-count {
  margin-left: 6px;
  font-size: 11px;
  color: var(--hf-text-muted);
  font-family: var(--hf-mono);
}
/* Disabled "coming soon" tabs — rendered as plain spans, not v-btn */
.cand-nav-item.soon {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--hf-text-subtle);
  cursor: default;
}
.soon-dot {
  margin-left: 6px;
  font-size: 9.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--hf-text-subtle);
  background: var(--hf-bg);
  padding: 1px 5px;
  border-radius: 5px;
}
:deep(.v-btn__overlay) {
  background: transparent;
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

.cand-bg {
  min-height: 100%;
  background:
    radial-gradient(800px 400px at 100% 0%, rgba(16, 185, 129, 0.06), transparent 60%),
    radial-gradient(800px 400px at 0% 100%, rgba(99, 102, 241, 0.05), transparent 60%),
    #fbfaf7;
}
.cand-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 32px 64px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
</style>
