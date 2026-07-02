/* Pipeline (kanban) view types — wired to GET /applications/board. */

export type PipelineStage =
  | 'APPLIED' | 'SCREENED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED'

export const STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREENED: 'Screened',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
}

/** Stages rendered as kanban columns (REJECTED is the separate lane). */
export const ACTIVE_STAGES: PipelineStage[] = ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED']

export interface PipelineCard {
  id: string
  currentStage: PipelineStage
  aiFitScore: number | null
  appliedAt: string
  candidate: { id: string; fullName: string; email: string }
  job: { id: string; title: string }
}

export interface BoardResponse {
  job: { id: string; title: string }
  stages: Record<PipelineStage, PipelineCard[]>
  counts: Record<PipelineStage, number>
}

export interface JobOption {
  id: string
  title: string
}
