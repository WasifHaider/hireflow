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

  // Independent state: the suggestions card is non-critical and must never
  // block or error out the main dashboard if the AI call is slow/unavailable.
  const suggestions = ref<string[]>([])
  const suggestionsLoading = ref(false)

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

  async function fetchSuggestions(): Promise<void> {
    suggestionsLoading.value = true
    try {
      const { data } = await api.get<{ suggestions: string[] }>('/dashboard/suggestions')
      suggestions.value = data.suggestions
    } catch {
      // Silent: this card falls back to its own "Coming soon"/empty state.
      suggestions.value = []
    } finally {
      suggestionsLoading.value = false
    }
  }

  return {
    summary,
    recentApplications,
    loading,
    error,
    suggestions,
    suggestionsLoading,
    load,
    fetchSuggestions,
  }
})
