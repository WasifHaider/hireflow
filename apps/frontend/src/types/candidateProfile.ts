// Shape returned by GET/PATCH /candidate/me (CandidateAuthGuard).

export interface CandidateProfile {
  id: string
  fullName: string
  email: string
  phone: string | null
  linkedinUrl: string | null
  emailVerified: boolean
  createdAt: string
  applicationCount: number
}

export interface UpdateCandidateProfileInput {
  fullName?: string
  phone?: string | null
  linkedinUrl?: string | null
}
