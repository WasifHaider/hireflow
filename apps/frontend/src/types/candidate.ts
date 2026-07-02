// Candidate (application) domain types — mirror the backend applications endpoints.

export type ApplicationStage =
  | 'APPLIED' | 'SCREENED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED'

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  SCREENED: 'Screened',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
}

export const STAGE_ORDER: ApplicationStage[] = [
  'APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED',
]

// AI-fit range buckets — value matches the backend facet keys + filter params.
export const AI_FIT_RANGES: { key: string; label: string; min?: number; max?: number }[] = [
  { key: '90-100', label: '90 – 100', min: 90, max: 100 },
  { key: '80-89', label: '80 – 89', min: 80, max: 89 },
  { key: '70-79', label: '70 – 79', min: 70, max: 79 },
  { key: 'below-70', label: 'Below 70', min: 0, max: 69 },
]

export interface CandidateListItem {
  id: string
  candidate: { id: string; fullName: string; email: string }
  job: { id: string; title: string }
  currentStage: ApplicationStage
  aiFitScore: number | null
  appliedAt: string
}

export interface CandidateListResponse {
  data: CandidateListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CandidateFacets {
  stages: Record<ApplicationStage, number>
  jobs: { id: string; title: string; count: number }[]
  aiFitRanges: Record<string, number>
}

export interface CandidateDetail {
  id: string
  currentStage: ApplicationStage
  aiFitScore: number | null
  aiScoreDetails: { model?: string; rawScore?: number; reason?: string } | null
  appliedAt: string
  updatedAt: string
  resumeText: string | null
  resumeFilename: string | null
  candidate: {
    id: string
    fullName: string
    email: string
    phone: string | null
    linkedinUrl: string | null
  }
  job: { id: string; title: string }
}

export interface CandidateListQuery {
  page?: number
  pageSize?: number
  q?: string
  stage?: ApplicationStage
  stages?: ApplicationStage[]
  jobId?: string
  scoreMin?: number
  scoreMax?: number
  sortBy?: 'appliedAt' | 'aiFitScore'
  sortOrder?: 'asc' | 'desc'
}

export const EMPTY_FACETS: CandidateFacets = {
  stages: { APPLIED: 0, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0 },
  jobs: [],
  aiFitRanges: {},
}
