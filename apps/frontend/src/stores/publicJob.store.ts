import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type { PublicJob, SubmitApplicationResult } from '@/types/publicJob'

export interface SubmitApplicationInput {
  jobId: string
  fullName: string
  email: string
  phone?: string
  linkedinUrl?: string
  coverLetter?: string
  resume: File
}

/** Store for the anonymous public job page + application submission. */
export const usePublicJobStore = defineStore('publicJob', () => {
  const job = ref<PublicJob | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchJob(companySlug: string, jobId: string): Promise<void> {
    loading.value = true
    error.value = null
    job.value = null
    try {
      const { data } = await api.get<PublicJob>(`/public/jobs/${companySlug}/${jobId}`)
      job.value = data
    } catch (err) {
      error.value = getApiErrorMessage(err, 'This job posting could not be found.')
    } finally {
      loading.value = false
    }
  }

  /** Submits the multipart application. Throws on failure so the caller can map
   *  status codes (409 duplicate, 422 bad resume) to field-level messaging. */
  async function submitApplication(input: SubmitApplicationInput): Promise<SubmitApplicationResult> {
    const form = new FormData()
    form.append('resume', input.resume)
    form.append('jobId', input.jobId)
    form.append('fullName', input.fullName)
    form.append('email', input.email)
    if (input.phone) form.append('phone', input.phone)
    if (input.linkedinUrl) form.append('linkedinUrl', input.linkedinUrl)
    if (input.coverLetter) form.append('coverLetter', input.coverLetter)

    // Override the instance's JSON default so the browser sets multipart + boundary.
    const { data } = await api.post<SubmitApplicationResult>('/public/applications', form, {
      headers: { 'Content-Type': undefined },
    })
    return data
  }

  return { job, loading, error, fetchJob, submitApplication }
})
