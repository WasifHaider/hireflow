<template>
  <v-menu location="bottom end">
    <template #activator="{ props: act }">
      <button class="hf-btn ghost" v-bind="act">
        Owner: {{ selectedLabel }}<HfIcon name="chevronDown" :size="14" />
      </button>
    </template>
    <v-list class="hf-select-menu" density="compact">
      <v-list-item @click="emit('update:modelValue', undefined)">
        <v-list-item-title>All</v-list-item-title>
      </v-list-item>
      <v-list-item v-for="o in owners" :key="o.id" @click="emit('update:modelValue', o.id)">
        <v-list-item-title>{{ o.fullName }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobOwner } from '@/types/job'
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ owners: JobOwner[]; modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string | undefined] }>()

const selectedLabel = computed(() => {
  if (!props.modelValue) return 'All'
  return props.owners.find((o) => o.id === props.modelValue)?.fullName ?? 'All'
})
</script>
