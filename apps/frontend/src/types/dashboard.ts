export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'

export interface ApplicationListItem {
  id: string
  candidate: { fullName: string; email: string }
  job: { id: string; title: string }
  currentStage: ApplicationStage
  aiFitScore: number | null
  appliedAt: string
}

export interface ApplicationListResponse {
  data: ApplicationListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DashboardSummary {
  stats: {
    activeJobs: number
    totalApplications: number
    avgAiScore: number
    awaitingReview: number
  }
  pipeline: Record<ApplicationStage, number>
  applicationsPerDay: { date: string; count: number }[]
}
