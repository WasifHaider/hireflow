import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/plugins/axios'
import { getApiErrorMessage } from '@/plugins/axios'
import type { CandidateApplication } from '@/types/candidateApplication'

/** Candidate-side store for the signed-in job seeker's own applications. */
export const useCandidateApplicationsStore = defineStore('candidateApplications', () => {
  const applications = ref<CandidateApplication[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchApplications(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<CandidateApplication[]>('/candidate/me/applications')
      applications.value = data
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Could not load your applications.')
      applications.value = []
    } finally {
      loading.value = false
    }
  }

  return { applications, loading, error, fetchApplications }
})
