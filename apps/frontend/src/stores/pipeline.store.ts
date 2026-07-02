import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import { useJobsStore } from '@/stores/jobs.store'
import type { BoardResponse, JobOption, PipelineCard, PipelineStage } from '@/types/pipeline'

export const usePipelineStore = defineStore('pipeline', () => {
  const board = ref<BoardResponse | null>(null)
  const jobs = ref<JobOption[]>([])
  const selectedJobId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPublishedJobs(): Promise<void> {
    const jobsStore = useJobsStore()
    const res = await jobsStore.fetchJobs({ status: 'PUBLISHED', pageSize: 100 })
    jobs.value = res.data.map((j) => ({ id: j.id, title: j.title }))
    if (!selectedJobId.value && jobs.value.length) {
      selectedJobId.value = jobs.value[0]!.id
    }
  }

  async function fetchBoard(jobId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<BoardResponse>('/applications/board', { params: { jobId } })
      board.value = data
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load the pipeline.')
      board.value = null
      throw e
    } finally {
      loading.value = false
    }
  }

  async function moveStage(
    appId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage,
  ): Promise<void> {
    if (!board.value || fromStage === toStage) return
    const from = board.value.stages[fromStage]
    const idx = from.findIndex((c) => c.id === appId)
    if (idx === -1) return
    const spliced = from.splice(idx, 1)
    const card = spliced[0] as PipelineCard

    // optimistic move — apply locally before the PATCH confirms
    const moved: PipelineCard = { ...card, currentStage: toStage }
    board.value.stages[toStage].unshift(moved)
    board.value.counts[fromStage] -= 1
    board.value.counts[toStage] += 1

    try {
      await api.patch(`/applications/${appId}/stage`, { stage: toStage })
    } catch (e) {
      // revert optimistic move on failure
      const undoIdx = board.value.stages[toStage].findIndex((c) => c.id === appId)
      if (undoIdx !== -1) board.value.stages[toStage].splice(undoIdx, 1)
      from.splice(idx, 0, card as PipelineCard)
      board.value.counts[fromStage] += 1
      board.value.counts[toStage] -= 1
      error.value = getApiErrorMessage(e, 'Failed to move the candidate.')
      throw e
    }
  }

  return { board, jobs, selectedJobId, loading, error, fetchPublishedJobs, fetchBoard, moveStage }
})
