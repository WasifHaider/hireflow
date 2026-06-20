// Job domain types — mirror the backend Prisma enums + Job model.

export type JobType = 'REMOTE' | 'HYBRID' | 'ONSITE'
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'
export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'

export interface Job {
  id: string
  companyId: string
  createdById: string
  title: string
  description: string
  requirements: string
  department: string | null
  location: string
  jobType: JobType
  employmentType: EmploymentType
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  minExperienceYears: number | null
  education: string | null
  autoRejectScore: number | null
  status: JobStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// Payload sent to POST /jobs and PATCH /jobs/:id. Optional fields are omitted
// when empty so the backend keeps its defaults.
export interface JobPayload {
  title: string
  description: string
  requirements: string
  department?: string
  location: string
  jobType: JobType
  employmentType: EmploymentType
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  mustHaveSkills?: string[]
  niceToHaveSkills?: string[]
  minExperienceYears?: number
  education?: string
  autoRejectScore?: number
  status?: JobStatus
}

// Wizard-local form state. Numerics are held as strings (raw input) and coerced
// to numbers when building the API payload.
export interface JobFormState {
  title: string
  department: string
  location: string
  jobType: JobType
  employmentType: EmploymentType
  salaryMin: string
  salaryMax: string
  salaryCurrency: string
  description: string
  requirements: string
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  minExperienceYears: string
  education: string
  autoRejectScore: number
}

export function emptyJobForm(): JobFormState {
  return {
    title: '',
    department: '',
    location: '',
    jobType: 'HYBRID',
    employmentType: 'FULL_TIME',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'USD',
    description: '',
    requirements: '',
    mustHaveSkills: [],
    niceToHaveSkills: [],
    minExperienceYears: '',
    education: '',
    autoRejectScore: 55,
  }
}

// Build the API payload from form state, dropping empty optionals.
export function toJobPayload(f: JobFormState, status: JobStatus): JobPayload {
  const num = (s: string): number | undefined => {
    const n = Number(s.replace(/[^0-9.]/g, ''))
    return s.trim() !== '' && !Number.isNaN(n) ? n : undefined
  }
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    requirements: f.requirements.trim(),
    location: f.location.trim(),
    jobType: f.jobType,
    employmentType: f.employmentType,
    department: f.department.trim() || undefined,
    salaryMin: num(f.salaryMin),
    salaryMax: num(f.salaryMax),
    salaryCurrency: f.salaryCurrency || 'USD',
    mustHaveSkills: f.mustHaveSkills,
    niceToHaveSkills: f.niceToHaveSkills,
    minExperienceYears: num(f.minExperienceYears),
    education: f.education.trim() || undefined,
    autoRejectScore: f.autoRejectScore,
    status,
  }
}

// The 6 fixed pipeline stages (editor deferred — backend uses a fixed enum).
export const FIXED_PIPELINE_STAGES: { name: string; desc: string; auto: boolean; color: string }[] = [
  { name: 'Applied', desc: 'New applicants — AI screen runs automatically', auto: true, color: '#94A3B8' },
  { name: 'Screened', desc: 'Passed the AI fit screen', auto: false, color: '#60A5FA' },
  { name: 'Interview', desc: 'In interview rounds', auto: false, color: '#A78BFA' },
  { name: 'Offer', desc: 'Offer extended', auto: false, color: '#F59E0B' },
  { name: 'Hired', desc: 'Accepted — hand off to people ops', auto: false, color: '#10B981' },
  { name: 'Rejected', desc: 'Not moving forward', auto: false, color: '#EF4444' },
]

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
}

// Canonical export name used by filter UI and facets — same values as EMPLOYMENT_LABELS.
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = EMPLOYMENT_LABELS

export interface JobOwner {
  id: string
  fullName: string
  avatarUrl: string | null
}

export interface JobFacets {
  departments: string[]
  locations: string[]
  owners: JobOwner[]
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  ONSITE: 'Onsite',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
}

export interface JobListItem extends Job {
  applicationCount: number
  owner: JobOwner
}

export interface JobListResponse {
  data: JobListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  counts: { all: number; DRAFT: number; PUBLISHED: number; CLOSED: number }
}

export interface JobListQuery {
  page?: number
  pageSize?: number
  status?: JobStatus
  search?: string
  sortBy?: 'createdAt' | 'title' | 'publishedAt'
  sortOrder?: 'asc' | 'desc'
  department?: string
  location?: string
  jobType?: JobType
  employmentType?: EmploymentType
  ownerId?: string
}
