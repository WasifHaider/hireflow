<template>
  <div class="resume-panel">
    <div class="resume-head">
      <div class="resume-title">Resume</div>
      <span v-if="filename" class="hf-muted resume-file">{{ filename }}</span>
      <AppButton
        v-if="text"
        variant="ghost"
        :loading="downloading"
        class="resume-dl"
        @click="emit('download')"
      >
        <HfIcon name="download" :size="14" />Download
      </AppButton>
    </div>
    <div v-if="text" class="hf-resume">{{ text }}</div>
    <div v-else class="resume-empty">No resume on file.</div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue'
import HfIcon from '@/components/common/HfIcon.vue'
defineProps<{ text: string | null; filename: string | null; downloading: boolean }>()
const emit = defineEmits<{ download: [] }>()
</script>

<style scoped>
.resume-panel { display: flex; flex-direction: column; gap: 10px; }
.resume-head { display: flex; align-items: center; gap: 8px; }
.resume-title { font-size: 13px; font-weight: 600; }
.resume-file { font-size: 11.5px; }
.resume-dl { margin-left: auto; }
.resume-empty { font-size: 12.5px; color: var(--hf-text-subtle); }
</style>
