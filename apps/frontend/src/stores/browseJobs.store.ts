import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type { BrowseJobItem, BrowseJobsQuery, BrowseJobsResponse } from '@/types/browseJob'

/** Store for the global public job board (GET /public/jobs). Server-side
 *  search, filters and pagination — the store just holds the current page. */
export const useBrowseJobsStore = defineStore('browseJobs', () => {
  const jobs = ref<BrowseJobItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(12)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchJobs(query: BrowseJobsQuery = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string | number> = {
        page: query.page ?? page.value,
        pageSize: query.pageSize ?? pageSize.value,
      }
      if (query.q) params.q = query.q
      if (query.location) params.location = query.location
      if (query.jobType) params.jobType = query.jobType
      if (query.employmentType) params.employmentType = query.employmentType

      const { data } = await api.get<BrowseJobsResponse>('/public/jobs', { params })
      jobs.value = data.items
      total.value = data.total
      page.value = data.page
      pageSize.value = data.pageSize
      totalPages.value = data.totalPages
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Could not load jobs. Please try again.')
      jobs.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  return { jobs, total, page, pageSize, totalPages, loading, error, fetchJobs }
})
