import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type {
  ApplicationListItem,
  ApplicationListResponse,
  DashboardSummary,
} from '@/types/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<DashboardSummary | null>(null)
  const recentApplications = ref<ApplicationListItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [summaryRes, recentRes] = await Promise.all([
        api.get<DashboardSummary>('/dashboard/summary'),
        api.get<ApplicationListResponse>('/applications', {
          params: { pageSize: 6, sortBy: 'appliedAt', sortOrder: 'desc' },
        }),
      ])
      summary.value = summaryRes.data
      recentApplications.value = recentRes.data.data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load dashboard.')
    } finally {
      loading.value = false
    }
  }

  return { summary, recentApplications, loading, error, load }
})
