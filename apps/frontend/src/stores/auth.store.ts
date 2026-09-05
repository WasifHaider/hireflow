import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'
import type { User, Company, AuthResponse, SignupCompanyRequest, SigninRequest, UpdateCompanyRequest } from '@/types/auth'

const TOKEN_KEY = 'access_token'

// Singleton promise so concurrent hydrate() calls resolve the same fetch.
let hydratePromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const company = ref<Company | null>(null)
  const accessToken = ref<string | null>(null)
  const isHydrated = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)
  const userFullName = computed(() => user.value?.fullName ?? '')
  const companyName = computed(() => company.value?.name ?? '')

  function _setAuth(data: AuthResponse) {
    user.value = data.user
    company.value = data.company
    accessToken.value = data.accessToken
    localStorage.setItem(TOKEN_KEY, data.accessToken)
  }

  function _clearAuth() {
    user.value = null
    company.value = null
    accessToken.value = null
    localStorage.removeItem(TOKEN_KEY)
    hydratePromise = null
  }

  async function signupCompany(payload: SignupCompanyRequest): Promise<void> {
    const { data } = await api.post<AuthResponse>('/auth/company/signup', payload)
    _setAuth(data)
  }

  async function signin(payload: SigninRequest): Promise<void> {
    const { data } = await api.post<AuthResponse>('/auth/signin', payload)
    _setAuth(data)
  }

  async function signout(): Promise<void> {
    _clearAuth()
    // Dynamic import breaks the potential router ↔ store circular dependency.
    const { default: router } = await import('@/router')
    router.push('/signin')
  }

  async function fetchCurrentUser(): Promise<void> {
    const { data } = await api.get<{ user: User; company: Company }>('/auth/me')
    user.value = data.user
    company.value = data.company
  }

  async function updateCompany(payload: UpdateCompanyRequest): Promise<void> {
    const { data } = await api.patch<Company>('/auth/company', payload)
    company.value = data
  }

  async function checkSlugAvailable(slug: string): Promise<boolean> {
    const { data } = await api.get<{ available: boolean }>('/auth/company/slug-available', {
      params: { slug },
    })
    return data.available
  }

  async function hydrate(): Promise<void> {
    if (isHydrated.value) return
    if (hydratePromise) return hydratePromise

    hydratePromise = (async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        accessToken.value = token
        try {
          await fetchCurrentUser()
        } catch {
          // Expired or invalid token — clear silently so the guard can redirect.
          _clearAuth()
        }
      }
      isHydrated.value = true
    })()

    return hydratePromise
  }

  return {
    user,
    company,
    accessToken,
    isHydrated,
    isAuthenticated,
    userFullName,
    companyName,
    signupCompany,
    signin,
    signout,
    fetchCurrentUser,
    updateCompany,
    checkSlugAvailable,
    hydrate,
  }
})
