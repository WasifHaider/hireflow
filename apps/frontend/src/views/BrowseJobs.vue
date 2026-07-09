<template>
  <div class="browse">
    <!-- Heading -->
    <header class="browse-head">
      <div>
        <h1 class="browse-title">Browse jobs</h1>
        <p class="browse-sub">Open roles across every company hiring on HireFlow.</p>
      </div>
    </header>

    <!-- Toolbar -->
    <div class="hf-card browse-toolbar">
      <div class="search-box">
        <HfIcon name="search" :size="16" class="search-icon" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Search by title or location…"
        />
      </div>
      <div class="filter-field">
        <AppField v-model="jobType" type="select" :items="workModeItems" placeholder="Any work mode" />
      </div>
      <div class="filter-field">
        <AppField v-model="employmentType" type="select" :items="employmentItems" placeholder="Any type" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="job-grid">
      <div v-for="n in 6" :key="n" class="hf-card job-card is-skeleton">
        <div class="sk-line" style="width: 44px; height: 44px; border-radius: 10px" />
        <div class="sk-line" style="width: 70%; height: 16px; margin-top: 14px" />
        <div class="sk-line" style="width: 40%; height: 12px; margin-top: 8px" />
        <div class="sk-line" style="width: 90%; height: 12px; margin-top: 18px" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="browse-state">
      <p class="hf-muted">{{ error }}</p>
      <AppButton variant="ghost" @click="load">Try again</AppButton>
    </div>

    <!-- Empty -->
    <div v-else-if="!jobs.length" class="browse-state">
      <div style="font-size: 34px">🔍</div>
      <h3>No jobs match your search</h3>
      <p class="hf-muted">Try clearing filters or searching for a different role.</p>
    </div>

    <!-- Results -->
    <template v-else>
      <div class="job-grid">
        <RouterLink
          v-for="job in jobs"
          :key="job.id"
          :to="`/candidate/jobs/${job.company.slug}/${job.id}`"
          class="hf-card job-card"
        >
          <div class="job-mark" :style="{ background: brandGradient(job.company.brandColor) }">
            <img v-if="job.company.logoUrl" :src="job.company.logoUrl" alt="" class="job-mark-img" />
            <template v-else>{{ job.company.name.charAt(0).toUpperCase() }}</template>
          </div>
          <h3 class="job-name">{{ job.title }}</h3>
          <div class="job-company">{{ job.company.name }}</div>
          <div class="job-tags">
            <span v-if="job.location" class="job-tag"><HfIcon name="map" :size="12" />{{ job.location }}</span>
            <span v-if="workModeLabel(job.jobType)" class="job-tag">{{ workModeLabel(job.jobType) }}</span>
            <span v-if="employmentLabel(job.employmentType)" class="job-tag">{{ employmentLabel(job.employmentType) }}</span>
          </div>
          <div class="job-foot">
            <span class="job-salary">{{ salaryText(job) || 'Salary not disclosed' }}</span>
            <span class="job-view">View <HfIcon name="arrowRight" :size="13" /></span>
          </div>
        </RouterLink>
      </div>

      <div class="hf-card browse-pager">
        <AppPagination
          :total="total"
          :page="page"
          :page-size="pageSize"
          :page-size-options="[12, 24, 48]"
          noun="jobs"
          @update:page="onPage"
          @update:page-size="onPageSize"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBrowseJobsStore } from '@/stores/browseJobs.store'
import type { BrowseJobItem } from '@/types/browseJob'
import {
  brandGradient,
  employmentLabel,
  salaryLine,
  workModeLabel,
} from '@/utils/jobFormat'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import HfIcon from '@/components/common/HfIcon.vue'

const store = useBrowseJobsStore()
const { jobs, total, page, pageSize, loading, error } = storeToRefs(store)

const search = ref('')
const jobType = ref('')
const employmentType = ref('')

const workModeItems = [
  { title: 'Any work mode', value: '' },
  { title: 'Remote', value: 'REMOTE' },
  { title: 'Hybrid', value: 'HYBRID' },
  { title: 'On-site', value: 'ONSITE' },
]
const employmentItems = [
  { title: 'Any type', value: '' },
  { title: 'Full-time', value: 'FULL_TIME' },
  { title: 'Part-time', value: 'PART_TIME' },
  { title: 'Contract', value: 'CONTRACT' },
  { title: 'Internship', value: 'INTERNSHIP' },
  { title: 'Temporary', value: 'TEMPORARY' },
]

function load(toPage = page.value) {
  store.fetchJobs({
    page: toPage,
    pageSize: pageSize.value,
    q: search.value.trim() || undefined,
    jobType: jobType.value || undefined,
    employmentType: employmentType.value || undefined,
  })
}

function salaryText(job: BrowseJobItem): string {
  return salaryLine(job.salaryMin, job.salaryMax, job.salaryCurrency)
}

// Debounced search; filters reset to page 1.
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 300)
})
watch([jobType, employmentType], () => load(1))

function onPage(p: number) {
  load(p)
}
function onPageSize(size: number) {
  pageSize.value = size
  load(1)
}

onMounted(() => load(1))
</script>

<style scoped>
.browse {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.browse-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--hf-text);
}
.browse-sub {
  margin-top: 4px;
  font-size: 14px;
  color: var(--hf-text-muted);
}

/* Toolbar */
.browse-toolbar {
  display: flex;
  gap: 12px;
  padding: 14px;
  align-items: center;
}
.search-box {
  position: relative;
  flex: 1;
  min-width: 0;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--hf-text-muted);
}
.search-input {
  width: 100%;
  height: 44px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--hf-border);
  border-radius: 9px;
  font-size: 14px;
  color: var(--hf-text);
  background: white;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.search-input:focus {
  outline: none;
  border-color: var(--hf-primary);
  box-shadow: 0 0 0 3px var(--hf-primary-soft);
}
.filter-field {
  width: 180px;
}
.filter-field :deep(.field) {
  gap: 0;
}

/* Grid */
.job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.job-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
}
.job-card:not(.is-skeleton):hover {
  border-color: var(--hf-primary);
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08);
  transform: translateY(-1px);
}
.job-mark {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 17px;
  overflow: hidden;
}
.job-mark-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.job-name {
  margin-top: 14px;
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--hf-text);
  line-height: 1.35;
}
.job-company {
  margin-top: 3px;
  font-size: 13px;
  color: var(--hf-text-muted);
}
.job-tags {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.job-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 7px;
  background: var(--hf-bg);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--hf-text-muted);
}
.job-foot {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--hf-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.job-salary {
  font-size: 13px;
  font-weight: 600;
  color: var(--hf-text);
  font-family: var(--hf-mono);
}
.job-view {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--hf-primary);
}

/* Pager */
.browse-pager {
  padding: 0;
  overflow: hidden;
}
.browse-pager :deep(.hf-pagination) {
  border-top: none;
  background: white;
}

/* States */
.browse-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 20px;
  text-align: center;
}
.browse-state h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--hf-text);
}

/* Skeleton */
.sk-line {
  border-radius: 6px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: sk 1.4s ease infinite;
}
@keyframes sk {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
