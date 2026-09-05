// Analytics domain types — mirror backend `src/analytics` DTOs.

export interface FunnelStage {
  stage: string
  count: number
}

export interface ScoreHistogramBin {
  range: string
  count: number
}

export interface TopJob {
  id: string
  title: string
  department: string | null
  applicationCount: number
  avgScore: number
  hires: number
}

export interface AnalyticsSummary {
  totalApplications: number
  hired: number
  funnel: FunnelStage[]
  scoreHistogram: ScoreHistogramBin[]
  topJobs: TopJob[]
}
