<template>
  <component :is="to ? RouterLink : 'div'" :to="to" class="hf-logo">
    <div class="hf-logo-mark">H</div>
    <span v-if="!markOnly">HireFlow</span>
  </component>
</template>

<script setup lang="ts">
// Shared brand mark (logo square + wordmark). Used in both recruiter and
// candidate app bars so the brand lives in one place. `markOnly` drops the
// wordmark (e.g. collapsed rail sidebar); `to` makes it a router link.
import { RouterLink } from 'vue-router'

withDefaults(defineProps<{ to?: string; markOnly?: boolean }>(), {
  to: undefined,
  markOnly: false,
})
</script>
