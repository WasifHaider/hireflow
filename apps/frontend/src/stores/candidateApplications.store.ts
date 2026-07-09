import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api from '@/plugins/axios'
import { getApiErrorMessage } from '@/plugins/axios'
import type { CandidateApplication } from '@/types/candidateApplication'

export interface ApplyToJobInput {
  jobId: string
  coverLetter?: string
  resume: File
}

/** Candidate-side store for the signed-in job seeker's own applications. */
export const useCandidateApplicationsStore = defineStore('candidateApplications', () => {
  const applications = ref<CandidateApplication[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Set of job ids the candidate has already applied to — used to disable the
   *  apply CTA on the job-detail page. */
  const appliedJobIds = computed(() => new Set(applications.value.map((a) => a.job.id)))

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

  /** Authenticated apply (POST /candidate/applications, multipart). Identity is
   *  taken server-side from the token. Throws so the caller can map 404/409. */
  async function applyToJob(input: ApplyToJobInput): Promise<void> {
    const form = new FormData()
    form.append('resume', input.resume)
    form.append('jobId', input.jobId)
    if (input.coverLetter) form.append('coverLetter', input.coverLetter)

    // Override the JSON default so the browser sets multipart + boundary.
    await api.post('/candidate/applications', form, {
      headers: { 'Content-Type': undefined },
    })
  }

  return { applications, loading, error, appliedJobIds, fetchApplications, applyToJob }
})
