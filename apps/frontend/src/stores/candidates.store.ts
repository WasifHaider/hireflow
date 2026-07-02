import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type {
  CandidateDetail,
  CandidateFacets,
  CandidateListQuery,
  CandidateListResponse,
} from '@/types/candidate'
import { EMPTY_FACETS } from '@/types/candidate'

export const useCandidatesStore = defineStore('candidates', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const facets = ref<CandidateFacets>(EMPTY_FACETS)

  async function fetchCandidates(query: CandidateListQuery = {}): Promise<CandidateListResponse> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string | number> = {}
      if (query.page) params.page = query.page
      if (query.pageSize) params.pageSize = query.pageSize
      if (query.q) params.q = query.q
      if (query.stage) params.stage = query.stage
      if (query.stages?.length) params.stages = query.stages.join(',')
      if (query.jobId) params.jobId = query.jobId
      if (query.scoreMin != null) params.scoreMin = query.scoreMin
      if (query.scoreMax != null) params.scoreMax = query.scoreMax
      if (query.sortBy) params.sortBy = query.sortBy
      if (query.sortOrder) params.sortOrder = query.sortOrder
      const { data } = await api.get<CandidateListResponse>('/applications', { params })
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load candidates.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchFacets(): Promise<void> {
    const { data } = await api.get<CandidateFacets>('/applications/facets')
    facets.value = data
  }

  async function fetchCandidate(id: string): Promise<CandidateDetail> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<CandidateDetail>(`/applications/${id}`)
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load candidate.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchResumeUrl(id: string): Promise<string> {
    const { data } = await api.get<{ signedUrl: string }>(`/applications/${id}/resume-url`)
    return data.signedUrl
  }

  return { loading, error, facets, fetchCandidates, fetchFacets, fetchCandidate, fetchResumeUrl }
})
