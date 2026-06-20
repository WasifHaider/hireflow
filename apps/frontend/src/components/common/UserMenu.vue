<template>
  <v-menu location="bottom end" offset="8" content-class="hf-menu-pane" :ripple="false">
    <template #activator="{ props }">
      <v-btn class="hf-user-pill" variant="text" :ripple="false" v-bind="props">
        <span class="hf-avatar sm">{{ initials }}</span>
        <span v-if="name" class="hf-user-name">{{ name }}</span>
        <HfIcon name="chevron" :size="14" />
      </v-btn>
    </template>
    <div class="hf-menu">
      <button type="button" class="hf-menu-item danger" @click="$emit('signout')">
        <HfIcon name="logout" :size="16" />
        <span>Sign out</span>
      </button>
    </div>
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

<!-- Menu pane teleports to <body>, outside this component's scope — style globally. -->
<style>
.hf-menu-pane {
  border-radius: var(--hf-radius-md);
  box-shadow: var(--hf-shadow-lg);
  border: 1px solid var(--hf-border);
  background: #fff;
  overflow: hidden;
}
.hf-menu {
  min-width: 184px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hf-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--hf-radius-sm);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--hf-text);
  text-align: left;
  transition: background 0.12s ease, color 0.12s ease;
}
.hf-menu-item:hover {
  background: var(--hf-bg);
}
.hf-menu-item.danger {
  color: var(--hf-danger);
}
.hf-menu-item.danger:hover {
  background: var(--hf-danger-soft);
}
</style>
