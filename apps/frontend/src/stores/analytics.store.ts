import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type { AnalyticsSummary } from '@/types/analytics'

export const useAnalyticsStore = defineStore('analytics', () => {
  const summary = ref<AnalyticsSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<AnalyticsSummary>('/analytics/summary')
      summary.value = data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load analytics.')
    } finally {
      loading.value = false
    }
  }

  return { summary, loading, error, load }
})
