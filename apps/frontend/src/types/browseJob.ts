// Shapes for the global public job board — GET /public/jobs (anonymous).

export interface BrowseJobCompany {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  brandColor: string | null
}

export interface BrowseJobItem {
  id: string
  title: string
  location: string | null
  jobType: string | null
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  publishedAt: string | null
  company: BrowseJobCompany
}

export interface BrowseJobsResponse {
  items: BrowseJobItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface BrowseJobsQuery {
  page?: number
  pageSize?: number
  q?: string
  location?: string
  jobType?: string
  employmentType?: string
}
