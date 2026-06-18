<template>
  <v-menu location="bottom end">
    <template #activator="{ props }">
      <v-btn class="hf-user-pill" variant="text" :ripple="false" v-bind="props">
        <span class="hf-avatar sm">{{ initials }}</span>
        <span v-if="name" class="hf-user-name">{{ name }}</span>
        <HfIcon name="chevron" :size="14" />
      </v-btn>
    </template>
    <v-list density="compact" min-width="180">
      <v-list-item @click="$emit('signout')">
        <template #prepend><v-icon size="16">mdi-logout</v-icon></template>
        <v-list-item-title>Sign out</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
// Shared avatar pill + dropdown (sign out). Recruiter passes initials only;
// candidate also passes a first name. Parent owns the sign-out action.
import HfIcon from '@/components/common/HfIcon.vue'

defineProps<{ initials: string; name?: string }>()
defineEmits<{ signout: [] }>()
</script>

<style scoped>
/* v-btn defaults (uppercase, min-width, elevation) fight the pill look. */
.hf-user-pill.v-btn {
  height: auto;
  min-width: 0;
  padding: 3px 8px 3px 3px;
  border-radius: 20px;
  text-transform: none;
  letter-spacing: normal;
  font: inherit;
  color: var(--hf-text);
}
.hf-user-name {
  font-size: 13px;
  font-weight: 500;
}
:deep(.v-btn__overlay) {
  background: transparent;
}
.hf-user-pill.v-btn:hover {
  background: var(--hf-bg);
}
</style>
