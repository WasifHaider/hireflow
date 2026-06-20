<template>
  <div class="jobs-page">
    <JobsToolbar
      :search="search"
      :status="statusFilter"
      :counts="response.counts"
      :facets="facets"
      :filters="filters"
      :owner-id="ownerId"
      :hidden-cols="hiddenCols"
      @update:search="onSearch"
      @update:status="onStatus"
      @update:filters="filters = $event"
      @update:owner-id="ownerId = $event"
      @update:hidden-cols="hiddenCols = $event"
      @new="router.push('/jobs/new')"
    />

    <JobsTable
      :jobs="response.data"
      :loading="store.loading"
      :total="response.total"
      :page="page"
      :page-size="pageSize"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @update:options="onOptions"
      @row-click="(j) => router.push(`/jobs/${j.id}/edit`)"
      @action="onAction"
    />

    <!-- delete confirm -->
    <v-dialog v-model="confirmOpen" max-width="420">
      <v-card class="confirm-card">
        <div class="confirm-title">Delete this job?</div>
        <p class="confirm-body">
          "{{ pendingDelete?.title }}" will be removed. Existing applications are kept but the job is hidden.
        </p>
        <div class="confirm-actions">
          <AppButton variant="ghost" @click="confirmOpen = false">Cancel</AppButton>
          <AppButton variant="primary" :loading="store.saving" @click="doDelete">Delete</AppButton>
        </div>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.open" :timeout="2600" location="bottom right">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '@/stores/jobs.store'
import type { JobFacets, JobListItem, JobListResponse, JobStatus } from '@/types/job'
import type { JobFilters } from '@/components/jobs/JobsFiltersMenu.vue'
import JobsToolbar from '@/components/jobs/JobsToolbar.vue'
import JobsTable from '@/components/jobs/JobsTable.vue'
import AppButton from '@/components/common/AppButton.vue'

type StatusFilter = JobStatus | 'ALL'
type SortBy = 'createdAt' | 'title' | 'publishedAt'

const router = useRouter()
const store = useJobsStore()

const page = ref(1)
const pageSize = ref(10)
const search = ref('')
const statusFilter = ref<StatusFilter>('ALL')
const sortBy = ref<SortBy>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Toolbar filter state — wired to real backend in Task 10.
const filters = ref<JobFilters>({})
const ownerId = ref<string | undefined>(undefined)
const hiddenCols = ref<string[]>([])
const facets = ref<JobFacets>({ departments: [], locations: [], owners: [] })

const response = ref<JobListResponse>({ data: [], total: 0, page: 1, pageSize: pageSize.value, totalPages: 0, counts: { all: 0, DRAFT: 0, PUBLISHED: 0, CLOSED: 0 } })

const confirmOpen = ref(false)
const pendingDelete = ref<JobListItem | null>(null)
const snack = reactive({ open: false, text: '' })

function notify(text: string) {
  snack.text = text
  snack.open = true
}

async function load() {
  try {
    response.value = await store.fetchJobs({
      page: page.value,
      pageSize: pageSize.value,
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      search: search.value.trim() || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
  } catch {
    notify(store.error ?? 'Failed to load jobs.')
  }
}

// debounce search
let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch(value: string) {
  search.value = value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}

function onStatus(value: StatusFilter) {
  statusFilter.value = value
  page.value = 1
  load()
}

// Page / sort / rows-per-page changes come from the table (AppDataTable's footer
// + sortable headers). v-data-table-server also fires this once on mount with the
// current state — the no-op guard skips that echo so we don't double-fetch.
function onOptions(o: { page: number; pageSize: number; sortBy: SortBy; sortOrder: 'asc' | 'desc' }) {
  const sortChanged = o.sortBy !== sortBy.value || o.sortOrder !== sortOrder.value
  const sizeChanged = o.pageSize !== pageSize.value
  const pageChanged = o.page !== page.value
  if (!sortChanged && !sizeChanged && !pageChanged) return

  sortBy.value = o.sortBy
  sortOrder.value = o.sortOrder
  pageSize.value = o.pageSize
  // Sorting or resizing the page resets to page 1; otherwise honor the new page.
  page.value = sortChanged || sizeChanged ? 1 : o.page
  load()
}

async function onAction(e: { type: 'publish' | 'close' | 'reopen' | 'delete' | 'edit'; job: JobListItem }) {
  if (e.type === 'edit') {
    router.push(`/jobs/${e.job.id}/edit`)
    return
  }
  if (e.type === 'delete') {
    pendingDelete.value = e.job
    confirmOpen.value = true
    return
  }
  const status: JobStatus = e.type === 'close' ? 'CLOSED' : 'PUBLISHED'
  try {
    await store.setJobStatus(e.job.id, status)
    notify(e.type === 'publish' ? 'Job published.' : e.type === 'close' ? 'Job closed.' : 'Job reopened.')
    load()
  } catch {
    notify(store.error ?? 'Action failed.')
  }
}

async function doDelete() {
  if (!pendingDelete.value) return
  try {
    await store.deleteJob(pendingDelete.value.id)
    confirmOpen.value = false
    notify('Job deleted.')
    load()
  } catch {
    notify(store.error ?? 'Failed to delete job.')
  } finally {
    pendingDelete.value = null
  }
}

load()
</script>

<style scoped>
.jobs-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.confirm-card {
  padding: 22px;
  border-radius: 12px;
}
.confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--hf-text);
}
.confirm-body {
  margin: 8px 0 18px;
  font-size: 13.5px;
  color: var(--hf-text-muted);
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
