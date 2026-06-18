<template>
  <v-app>
    <RouterView />
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
// Kick off token validation immediately. The router guard awaits this before
// any navigation resolves, so no protected page renders before it completes.
authStore.hydrate()
</script>
