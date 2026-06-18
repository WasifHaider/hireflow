<template>
  <v-app-bar flat border="b" color="white" height="56">
    <div class="nav-inner">
      <RouterLink to="/dashboard" class="nav-logo">
        <div class="logo-mark">H</div>
        <span class="logo-text">HireFlow</span>
      </RouterLink>

      <v-spacer />

      <v-menu location="bottom end">
        <template #activator="{ props }">
          <button class="user-pill" v-bind="props">
            <div class="user-av">{{ authStore.userFullName.charAt(0).toUpperCase() }}</div>
            <div class="user-meta">
              <span class="user-name">{{ authStore.userFullName }}</span>
              <span class="user-company">{{ authStore.companyName }}</span>
            </div>
            <v-icon size="16" color="#9CA3AF">mdi-chevron-down</v-icon>
          </button>
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item @click="handleSignOut">
            <template #prepend>
              <v-icon size="16">mdi-logout</v-icon>
            </template>
            <v-list-item-title>Sign out</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </v-app-bar>

  <v-main>
    <slot />
  </v-main>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

async function handleSignOut() {
  await authStore.signout()
}
</script>

<style scoped>
.nav-inner {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 20px;
  gap: 16px;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #4F46E5;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
}

.logo-text {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  font-family: 'Inter', sans-serif;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 5px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  background: #F9FAFB;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
}
.user-pill:hover { background: #F3F4F6; }

.user-av {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #4F46E5;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

.user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  line-height: 1.2;
}

.user-company {
  font-size: 11px;
  color: #6B7280;
  line-height: 1.2;
}
</style>
