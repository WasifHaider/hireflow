export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export type Role = 'ADMIN' | 'RECRUITER'

export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  companyId: string
}

export interface Company {
  id: string
  name: string
  slug: string
  industry?: string
  size?: CompanySize
}

export interface AuthResponse {
  user: User
  company: Company
  accessToken: string
}

export interface SignupCompanyRequest {
  companyName: string
  fullName: string
  email: string
  password: string
  industry?: string
  size?: CompanySize
}

export interface UpdateCompanyRequest {
  companyName?: string
  slug?: string
}

export interface SigninRequest {
  email: string
  password: string
}

export interface ApiErrorResponse {
  statusCode: number
  message: string | string[]
  error: string
}

// ── Candidate (job-seeker) auth ────────────────────────────────────────────────
export interface Candidate {
  id: string
  email: string
  fullName: string
  phone: string | null
  linkedinUrl: string | null
  emailVerifiedAt: string | null
}

export interface CandidateSignupRequest {
  fullName: string
  email: string
  password: string
  linkedinUrl?: string
}

export interface CandidateSigninRequest {
  email: string
  password: string
}

/** POST /auth/candidate/signin & GET /auth/candidate/verify */
export interface CandidateAuthResponse {
  user: Candidate
  accessToken: string
}
