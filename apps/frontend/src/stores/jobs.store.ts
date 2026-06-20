import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type { Job, JobPayload, JobStatus, JobListQuery, JobListResponse } from '@/types/job'

export const useJobsStore = defineStore('jobs', () => {
  const saving = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createJob(payload: JobPayload): Promise<Job> {
    saving.value = true
    error.value = null
    try {
      const { data } = await api.post<Job>('/jobs', payload)
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to save job.')
      throw e
    } finally {
      saving.value = false
    }
  }

  async function updateJob(id: string, payload: Partial<JobPayload>): Promise<Job> {
    saving.value = true
    error.value = null
    try {
      const { data } = await api.patch<Job>(`/jobs/${id}`, payload)
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to update job.')
      throw e
    } finally {
      saving.value = false
    }
  }

  async function fetchJob(id: string): Promise<Job> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<Job>(`/jobs/${id}`)
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load job.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchJobs(query: JobListQuery = {}): Promise<JobListResponse> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string | number> = {}
      if (query.page) params.page = query.page
      if (query.pageSize) params.pageSize = query.pageSize
      if (query.status) params.status = query.status
      if (query.search) params.search = query.search
      if (query.sortBy) params.sortBy = query.sortBy
      if (query.sortOrder) params.sortOrder = query.sortOrder
      const { data } = await api.get<JobListResponse>('/jobs', { params })
      return data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load jobs.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function setJobStatus(id: string, status: JobStatus): Promise<Job> {
    return updateJob(id, { status })
  }

  async function deleteJob(id: string): Promise<void> {
    saving.value = true
    error.value = null
    try {
      await api.delete(`/jobs/${id}`)
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to delete job.')
      throw e
    } finally {
      saving.value = false
    }
  }

  return { saving, loading, error, createJob, updateJob, fetchJob, fetchJobs, setJobStatus, deleteJob }
})
