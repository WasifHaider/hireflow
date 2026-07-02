// Shape returned by GET /candidate/me/applications (CandidateAuthGuard).
// The candidate's own applications across all companies, newest first.

export type CandidateAppStage =
  | 'APPLIED'
  | 'SCREENED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'

export interface CandidateApplicationCompany {
  name: string
  slug: string
  logoUrl: string | null
}

export interface CandidateApplicationJob {
  id: string
  title: string
  location: string | null
  jobType: string | null
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  publishedAt: string | null
  /** false when the job was soft-deleted after the candidate applied. */
  jobAvailable: boolean
  company: CandidateApplicationCompany
}

export interface CandidateApplication {
  id: string
  currentStage: CandidateAppStage
  aiFitScore: number | null
  appliedAt: string
  resumeFilename: string | null
  job: CandidateApplicationJob
}
