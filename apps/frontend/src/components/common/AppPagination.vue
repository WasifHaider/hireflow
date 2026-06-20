<template>
  <div class="hf-pagination">
    <span class="left">
      Showing <strong>{{ rangeStart }}–{{ rangeEnd }}</strong> of <strong>{{ total }}</strong> jobs
    </span>
    <div class="right">
      <span class="rpp-label">Rows per page:</span>
      <select class="rpp" :value="pageSize" @change="onSize">
        <option v-for="o in (pageSizeOptions ?? [10, 25, 50])" :key="o" :value="o">{{ o }}</option>
      </select>
      <button class="nav" :disabled="page <= 1" aria-label="Previous page" @click="emit('update:page', page - 1)">
        <HfIcon name="chevronLeft" :size="16" />
      </button>
      <button class="nav" :disabled="page >= totalPages" aria-label="Next page" @click="emit('update:page', page + 1)">
        <HfIcon name="chevronRight" :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from './HfIcon.vue'

const props = defineProps<{ total: number; page: number; pageSize: number; pageSizeOptions?: number[] }>()
const emit = defineEmits<{ 'update:page': [number]; 'update:pageSize': [number] }>()

const totalPages = computed(() => (props.total === 0 ? 1 : Math.ceil(props.total / props.pageSize)))
const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

function onSize(e: Event) {
  emit('update:pageSize', Number((e.target as HTMLSelectElement).value))
}
</script>

<style scoped>
.hf-pagination {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--hf-border);
  background: var(--hf-surface-alt);
  font-size: 12.5px;
  color: var(--hf-text-muted);
}
.hf-pagination strong { color: var(--hf-text); font-weight: 600; }
.right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.rpp {
  border: 1px solid var(--hf-border);
  border-radius: 7px;
  background: var(--hf-surface);
  color: var(--hf-text);
  font-size: 12.5px;
  padding: 3px 6px;
  cursor: pointer;
}
.nav {
  display: grid; place-items: center;
  width: 28px; height: 28px;
  border: 1px solid var(--hf-border);
  border-radius: 7px;
  background: var(--hf-surface);
  color: var(--hf-text-muted);
  cursor: pointer;
}
.nav:hover:not(:disabled) { background: var(--hf-bg); color: var(--hf-text); }
.nav:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
