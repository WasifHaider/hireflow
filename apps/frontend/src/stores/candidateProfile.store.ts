import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type { CandidateProfile, UpdateCandidateProfileInput } from '@/types/candidateProfile'

/** Store for the signed-in candidate's own profile (GET/PATCH /candidate/me). */
export const useCandidateProfileStore = defineStore('candidateProfile', () => {
  const profile = ref<CandidateProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProfile(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<CandidateProfile>('/candidate/me')
      profile.value = data
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Could not load your profile.')
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  /** Persists the edited fields. Throws on failure so the view can surface a
   *  message; on success the store holds the refreshed profile. */
  async function updateProfile(input: UpdateCandidateProfileInput): Promise<void> {
    const { data } = await api.patch<CandidateProfile>('/candidate/me', input)
    profile.value = data
  }

  return { profile, loading, error, fetchProfile, updateProfile }
})
