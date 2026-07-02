<template>
  <div class="pipeline">
    <!-- Heading + actions -->
    <div class="head-row">
      <div>
        <h1 class="hf-h1">Pipeline</h1>
        <div class="hf-muted" style="margin-top: 4px">
          {{ activeTotal }} candidates in active stages · {{ store.jobs.length }} open jobs
        </div>
      </div>
      <div class="head-actions">
        <AppField v-model="search" class="search-field" placeholder="Search candidates">
          <template #append><HfIcon name="search" :size="15" /></template>
        </AppField>

        <AppField
          type="select"
          class="job-select"
          :model-value="store.selectedJobId"
          :items="jobItems"
          placeholder="Select a job"
          @update:model-value="selectJob($event as string)"
        />

        <AppField
          type="select"
          class="sort-select"
          :model-value="sortBy"
          :items="sortOptions"
          @update:model-value="sortBy = $event as SortKey"
        />
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.loading" class="hf-kanban">
      <div v-for="s in ACTIVE_STAGES" :key="s" class="hf-col">
        <div class="hf-col-head"><div class="hf-col-name">{{ STAGE_LABELS[s] }}</div></div>
        <div v-for="n in 3" :key="n" class="skel-card" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="hf-card placeholder">
      <div style="font-weight: 600">{{ store.error }}</div>
      <AppButton variant="ghost" @click="init">Retry</AppButton>
    </div>

    <!-- Board -->
    <template v-else-if="store.board">
      <div class="hf-kanban">
        <KanbanColumn
          v-for="s in ACTIVE_STAGES"
          :key="s"
          :stage="s"
          :cards="columnCards(s)"
          @open="openCandidate"
          @moved="onMoved"
        />
      </div>

      <!-- Rejected lane -->
      <div class="hf-card rejected-lane">
        <span class="rej-dot" />
        <div style="font-size: 13px; font-weight: 600">Rejected</div>
        <span class="hf-col-count">{{ store.board.counts.REJECTED }}</span>
        <span v-if="rejectedNames" class="hf-muted" style="font-size: 12px">
          Most recent: {{ rejectedNames }}
        </span>
        <AppButton variant="ghost" class="expand-btn" @click="rejectedOpen = !rejectedOpen">
          {{ rejectedOpen ? 'Collapse' : 'Expand' }}<HfIcon name="chevron" :size="14" />
        </AppButton>
      </div>
      <KanbanColumn
        v-if="rejectedOpen"
        stage="REJECTED"
        :cards="columnCards('REJECTED')"
        @open="openCandidate"
        @moved="onMoved"
      />
    </template>

    <!-- Undo toast -->
    <div v-if="toast" class="hf-toast">
      <div class="dot"><HfIcon name="check" :size="12" /></div>
      {{ toast.name }} moved to {{ STAGE_LABELS[toast.toStage] }} ·
      <span style="opacity: 0.6; cursor: pointer" @click="undoMove">Undo</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HfIcon from '@/components/common/HfIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppField from '@/components/common/AppField.vue'
import KanbanColumn from '@/components/pipeline/KanbanColumn.vue'
import { getApiErrorMessage } from '@/plugins/axios'
import { usePipelineStore } from '@/stores/pipeline.store'
import { ACTIVE_STAGES, STAGE_LABELS } from '@/types/pipeline'
import type { PipelineCard, PipelineStage } from '@/types/pipeline'

const router = useRouter()
const store = usePipelineStore()

const search = ref('')
const rejectedOpen = ref(false)

type SortKey = 'score-desc' | 'score-asc' | 'recent' | 'oldest'
const sortBy = ref<SortKey>('score-desc')
const sortOptions: { title: string; value: SortKey }[] = [
  { title: 'AI score (high → low)', value: 'score-desc' },
  { title: 'AI score (low → high)', value: 'score-asc' },
  { title: 'Newest applied', value: 'recent' },
  { title: 'Oldest applied', value: 'oldest' },
]

const jobItems = computed(() => store.jobs.map((j) => ({ title: j.title, value: j.id })))

function matchesSearch(c: PipelineCard): boolean {
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return c.candidate.fullName.toLowerCase().includes(q) || c.candidate.email.toLowerCase().includes(q)
}

function columnCards(stage: PipelineStage): PipelineCard[] {
  if (!store.board) return []
  const list = store.board.stages[stage].filter(matchesSearch)
  const sorted = [...list]
  sorted.sort((a, b) => {
    switch (sortBy.value) {
      case 'score-asc': return (a.aiFitScore ?? -1) - (b.aiFitScore ?? -1)
      case 'recent': return +new Date(b.appliedAt) - +new Date(a.appliedAt)
      case 'oldest': return +new Date(a.appliedAt) - +new Date(b.appliedAt)
      default: return (b.aiFitScore ?? -1) - (a.aiFitScore ?? -1)
    }
  })
  return sorted
}

const activeTotal = computed(() =>
  store.board ? ACTIVE_STAGES.reduce((sum, s) => sum + store.board!.counts[s], 0) : 0,
)
const rejectedNames = computed(() =>
  store.board ? store.board.stages.REJECTED.slice(0, 3).map((c) => c.candidate.fullName).join(', ') : '',
)

// Undo toast state
const toast = ref<{ id: string; name: string; fromStage: PipelineStage; toStage: PipelineStage } | null>(null)

async function onMoved(p: { id: string; name: string; fromStage: PipelineStage; toStage: PipelineStage }) {
  // vuedraggable mutated the throwaway copy this column was bound to; the store
  // arrays are still authoritative, so moveStage performs the real splice + PATCH.
  const ok = await persist(p.id, p.fromStage, p.toStage)
  if (ok) toast.value = p
}

async function persist(id: string, fromStage: PipelineStage, toStage: PipelineStage): Promise<boolean> {
  try {
    await store.moveStage(id, fromStage, toStage)
    return true
  } catch {
    // store reverts its own state; reload to resync the DOM lists vuedraggable mutated.
    await reload()
    return false
  }
}

async function undoMove() {
  if (!toast.value) return
  const t = toast.value
  const ok = await persist(t.id, t.toStage, t.fromStage)
  if (ok) toast.value = null
  else toast.value = null // reload() already ran; clear stale toast either way
}

function selectJob(id: string) {
  store.selectedJobId = id
  reload()
}
function reload() {
  if (store.selectedJobId) return store.fetchBoard(store.selectedJobId)
}
function openCandidate(id: string) {
  router.push(`/candidates/${id}`)
}

async function init() {
  try {
    await store.fetchPublishedJobs()
  } catch (e) {
    // fetchPublishedJobs has no try/catch of its own (Task 3); surface it here so
    // the error block + Retry render instead of failing silently.
    store.error = getApiErrorMessage(e, 'Failed to load jobs.')
    return
  }
  if (store.selectedJobId) await store.fetchBoard(store.selectedJobId)
}

onMounted(init)
</script>

<style scoped>
.pipeline { display: flex; flex-direction: column; gap: 16px; }
.head-row { display: flex; align-items: center; gap: 12px; }
.head-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.search-field { width: 240px; }
.search-field :deep(.v-field__input) { min-height: 38px; }

/* Job + sort selects: proper outlined fields sized to align with the search field. */
.job-select { min-width: 220px; }
.sort-select { min-width: 200px; }
.job-select :deep(.v-field__input),
.sort-select :deep(.v-field__input) {
  min-height: 38px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 13px;
}
.job-select :deep(.v-input__details),
.sort-select :deep(.v-input__details) { display: none; }
.job-select :deep(.v-field--variant-outlined .v-field__outline),
.sort-select :deep(.v-field--variant-outlined .v-field__outline) {
  --v-field-border-opacity: 1;
  color: var(--hf-border);
}
.job-select :deep(.v-field.v-field--focused .v-field__outline),
.sort-select :deep(.v-field.v-field--focused .v-field__outline) { color: var(--hf-primary); }
.placeholder { padding: 60px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--hf-text-muted); }
.rejected-lane { padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
.rej-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--hf-danger); }
.expand-btn.v-btn { margin-left: auto; height: 28px; padding: 0 8px; font-size: 12px; }
.skel-card { height: 76px; border-radius: 10px; background: var(--hf-bg); border: 1px solid var(--hf-border); opacity: 0.6; }
</style>
