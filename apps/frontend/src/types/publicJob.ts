// Shapes for the anonymous careers/apply surface (no auth).

export interface PublicJobCompany {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  brandColor: string | null
}

export interface PublicJob {
  id: string
  title: string
  description: string
  requirements: string | null
  location: string | null
  jobType: string | null
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  publishedAt: string | null
  company: PublicJobCompany
}

export interface SubmitApplicationResult {
  applicationId: string
  status: string
  message: string
}
