<template>
  <div class="candidates-page">
    <!-- Header -->
    <div class="page-head">
      <div>
        <div class="hf-muted crumb">{{ workspace }} · all jobs</div>
        <h1 class="hf-h1">Candidates</h1>
      </div>
    </div>

    <!-- Search + sort + columns -->
    <div class="toolbar">
      <div class="hf-search">
        <HfIcon name="search" :size="14" />
        <input
          ref="searchInput"
          :value="search"
          placeholder="Search by name, email, skill or note…"
          @input="onSearch(($event.target as HTMLInputElement).value)"
        />
        <span class="hf-kbd">⌘F</span>
      </div>
      <div class="sort">
        <span class="hf-muted">Sort:</span>
        <AppField
          type="select"
          :model-value="sortKey"
          :items="sortOptions"
          @update:model-value="onSort($event as string)"
        />
        <CandidatesColumnsMenu v-model="hiddenCols" />
      </div>
    </div>

    <!-- Active filter chips + matching count -->
    <CandidatesActiveFilters
      :stages="stages"
      :total-stages="STAGE_ORDER.length"
      :job-title="activeJobTitle"
      :range-label="activeRangeLabel"
      :total="response.total"
      @clear-stages="onClearStages"
      @clear-job="onClearJob"
      @clear-range="onClearRange"
      @clear-all="onClearAll"
    />

    <!-- Body: sidebar + table -->
    <div class="body-grid">
      <CandidatesFilterSidebar
        :facets="store.facets"
        :selected-stages="stages"
        :selected-job-id="jobId"
        :selected-range-key="rangeKey"
        @update:stages="onStages"
        @update:job-id="onJob"
        @update:score-range="onRange"
      />

      <div class="hf-card table-wrap">
        <CandidatesTable
          :candidates="response.data"
          :loading="store.loading"
          :total="response.total"
          :page="page"
          :page-size="pageSize"
          :sort-by="sortBy"
          :sort-order="sortOrder"
          :hidden-cols="hiddenCols"
          @row-click="(c) => router.push(`/candidates/${c.id}`)"
          @update:options="onOptions"
        />
        <AppPagination
          :total="response.total"
          :page="page"
          :page-size="pageSize"
          noun="candidates"
          @update:page="onPage"
          @update:page-size="onPageSize"
        />
      </div>
    </div>

    <v-snackbar v-model="snack.open" :timeout="2600" location="bottom end">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCandidatesStore } from '@/stores/candidates.store'
import { useAuthStore } from '@/stores/auth.store'
import type { ApplicationStage, CandidateListResponse } from '@/types/candidate'
import { STAGE_ORDER, AI_FIT_RANGES } from '@/types/candidate'
import CandidatesFilterSidebar from '@/components/candidates/CandidatesFilterSidebar.vue'
import CandidatesTable from '@/components/candidates/CandidatesTable.vue'
import CandidatesColumnsMenu from '@/components/candidates/CandidatesColumnsMenu.vue'
import CandidatesActiveFilters from '@/components/candidates/CandidatesActiveFilters.vue'
import AppField from '@/components/common/AppField.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import HfIcon from '@/components/common/HfIcon.vue'

const router = useRouter()
const route = useRoute()
const store = useCandidatesStore()
const auth = useAuthStore()

// auth.company is a separate ref (not nested under auth.user).
// auth.companyName is the computed that reads it — matches Dashboard.vue pattern.
const workspace = computed(() => auth.companyName || 'Workspace')

const page = ref(1)
const pageSize = ref(10)
// Prefilled from ?q= when navigating in from the top-bar search
// (RecruiterLayout) — normal in-page typing still goes through onSearch below.
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const sortBy = ref<'appliedAt' | 'aiFitScore'>('aiFitScore')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Default: all non-terminal stages selected (matches mockup default).
const stages = ref<ApplicationStage[]>([...STAGE_ORDER])
const jobId = ref<string | undefined>(undefined)
const rangeKey = ref<string | undefined>(undefined)
const scoreMin = ref<number | undefined>(undefined)
const scoreMax = ref<number | undefined>(undefined)

// Column visibility — persisted locally (guard against corrupt JSON).
function readHiddenCols(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem('hf.candidates.hiddenCols') ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
const hiddenCols = ref<string[]>(readHiddenCols())
watch(hiddenCols, (v) => localStorage.setItem('hf.candidates.hiddenCols', JSON.stringify(v)), { deep: true })

// Resolved labels for the active-filter chips.
const activeJobTitle = computed(() => store.facets.jobs.find((j) => j.id === jobId.value)?.title)
const activeRangeLabel = computed(() => AI_FIT_RANGES.find((r) => r.key === rangeKey.value)?.label)

// ⌘F / Ctrl+F focuses the search box (matches the kbd hint).
const searchInput = ref<HTMLInputElement | null>(null)
function onSearchHotkey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    searchInput.value?.focus()
  }
}

const sortKey = ref('ai-desc')
const sortOptions = [
  { title: 'AI fit (high to low)', value: 'ai-desc' },
  { title: 'AI fit (low to high)', value: 'ai-asc' },
  { title: 'Newest applied', value: 'applied-desc' },
  { title: 'Oldest applied', value: 'applied-asc' },
]

const response = ref<CandidateListResponse>({
  data: [], total: 0, page: 1, pageSize: pageSize.value, totalPages: 0,
})

const snack = reactive({ open: false, text: '' })
function notify(text: string) { snack.text = text; snack.open = true }

async function load() {
  try {
    // Send stages when a proper non-empty subset is selected; omit when all or none
    // selected (both mean "no stage filter" — show everything).
    const stagesParam =
      stages.value.length > 0 && stages.value.length < STAGE_ORDER.length
        ? stages.value
        : undefined
    response.value = await store.fetchCandidates({
      page: page.value,
      pageSize: pageSize.value,
      q: search.value.trim() || undefined,
      stages: stagesParam,
      jobId: jobId.value,
      scoreMin: scoreMin.value,
      scoreMax: scoreMax.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
  } catch {
    notify(store.error ?? 'Failed to load candidates.')
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch(v: unknown) {
  search.value = String(v ?? '')
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
}

function onSort(key: string) {
  sortKey.value = key
  const map: Record<string, ['appliedAt' | 'aiFitScore', 'asc' | 'desc']> = {
    'ai-desc': ['aiFitScore', 'desc'],
    'ai-asc': ['aiFitScore', 'asc'],
    'applied-desc': ['appliedAt', 'desc'],
    'applied-asc': ['appliedAt', 'asc'],
  }
  const entry = map[key]
  if (!entry) return
  ;[sortBy.value, sortOrder.value] = entry
  page.value = 1
  load()
}

function onStages(s: ApplicationStage[]) { stages.value = s; page.value = 1; load() }
function onJob(id: string | undefined) { jobId.value = id; page.value = 1; load() }
function onRange(r: { key?: string; min?: number; max?: number }) {
  rangeKey.value = r.key
  scoreMin.value = r.min
  scoreMax.value = r.max
  page.value = 1
  load()
}
function onPage(p: number) { page.value = p; load() }
function onPageSize(s: number) { pageSize.value = s; page.value = 1; load() }

// Active-filter chip removals.
function onClearStages() { stages.value = [...STAGE_ORDER]; page.value = 1; load() }
function onClearJob() { onJob(undefined) }
function onClearRange() { onRange({}) }
function onClearAll() {
  search.value = ''
  stages.value = [...STAGE_ORDER]
  jobId.value = undefined
  rangeKey.value = undefined
  scoreMin.value = undefined
  scoreMax.value = undefined
  page.value = 1
  load()
}

function onOptions(o: { page: number; pageSize: number; sortBy: 'appliedAt' | 'aiFitScore'; sortOrder: 'asc' | 'desc' }) {
  const sortChanged = o.sortBy !== sortBy.value || o.sortOrder !== sortOrder.value
  const sizeChanged = o.pageSize !== pageSize.value
  const pageChanged = o.page !== page.value
  if (!sortChanged && !sizeChanged && !pageChanged) return
  sortBy.value = o.sortBy
  sortOrder.value = o.sortOrder
  pageSize.value = o.pageSize
  page.value = sortChanged || sizeChanged ? 1 : o.page
  load()
}

onMounted(() => {
  load()
  store.fetchFacets().catch(() => { /* non-critical */ })
  window.addEventListener('keydown', onSearchHotkey)
})
onUnmounted(() => window.removeEventListener('keydown', onSearchHotkey))
</script>

<style scoped>
.candidates-page { display: flex; flex-direction: column; gap: 16px; }
.page-head { display: flex; align-items: flex-end; gap: 16px; }
.crumb { font-size: 12.5px; margin-bottom: 6px; }
.toolbar { display: flex; align-items: center; gap: 10px; }
.toolbar .hf-search { max-width: 360px; }
.sort { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.sort :deep(.v-select) { min-width: 190px; }
.sort :deep(.v-field) {
  border-radius: 8px;
  font-size: 13px;
  --v-field-padding-top: 0;
  --v-field-padding-bottom: 0;
}
.sort :deep(.v-select .v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 13px;
}
.sort :deep(.v-field__outline__start) { border-radius: 8px 0 0 8px; }
.sort :deep(.v-field__outline__end) { border-radius: 0 8px 8px 0; }
.sort :deep(.v-field--variant-outlined .v-field__outline) { --v-field-border-opacity: 1; color: var(--hf-border); }
.sort :deep(.v-field.v-field--focused .v-field__outline) { color: var(--hf-primary); }
.body-grid { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: flex-start; }
.table-wrap { padding: 0; overflow: hidden; }
</style>
