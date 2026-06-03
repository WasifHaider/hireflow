import axios from 'axios'
import type { ApiErrorResponse } from '@/types/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3200',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('access_token')
      const url: string = error.config?.url ?? ''
      const isAuthEndpoint = url.includes('/auth/signin') || url.includes('/auth/company/signup')
      if (token && !isAuthEndpoint) {
        localStorage.removeItem('access_token')
        window.location.href = '/signin'
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
