import axios from 'axios'
import type { ApiErrorResponse } from '@/types/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3200',
  headers: { 'Content-Type': 'application/json' },
})

// Candidate-authed endpoints live under /candidate; public + candidate-auth
// endpoints (/public, /auth/candidate) are anonymous. Everything else is the
// recruiter surface. Attach the matching token per request so the two sessions
// never leak into each other's calls.
function isCandidateApi(url: string): boolean {
  return url.startsWith('/candidate')
}
function isAnonymousApi(url: string): boolean {
  return url.startsWith('/public') || url.startsWith('/auth/candidate')
}

api.interceptors.request.use((config) => {
  const url: string = config.url ?? ''
  if (isAnonymousApi(url)) return config
  const key = isCandidateApi(url) ? 'candidate_access_token' : 'access_token'
  const token = localStorage.getItem(key)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url: string = error.config?.url ?? ''
      if (isCandidateApi(url)) {
        const token = localStorage.getItem('candidate_access_token')
        if (token) {
          localStorage.removeItem('candidate_access_token')
          localStorage.removeItem('candidate_user')
          window.location.href = '/candidate/signin'
        }
      } else {
        const token = localStorage.getItem('access_token')
        const isAuthEndpoint =
          url.includes('/auth/signin') || url.includes('/auth/company/signup')
        if (token && !isAuthEndpoint) {
          localStorage.removeItem('access_token')
          window.location.href = '/signin'
        }
      }
    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? (data.message[0] ?? fallback) : data.message
    }
  }
  return fallback
}

export default api
