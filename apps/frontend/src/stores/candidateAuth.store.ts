import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'
import type {
  Candidate,
  CandidateAuthResponse,
  CandidateSigninRequest,
  CandidateSignupRequest,
  CandidateSignupResponse,
} from '@/types/auth'

// Candidate sessions are kept under SEPARATE keys from the recruiter token
// (`access_token`) so the two flows never collide.
const CANDIDATE_TOKEN_KEY = 'candidate_access_token'
// The backend exposes NO candidate `/me` refresh endpoint, so we persist the
// SafeCandidate object returned at signin/verify and rehydrate from it on reload
// (rather than re-fetching). Stale only if the profile changes server-side —
// acceptable until a profile-update flow exists.
const CANDIDATE_USER_KEY = 'candidate_user'

function _readStoredUser(): Candidate | null {
  const raw = localStorage.getItem(CANDIDATE_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Candidate
  } catch {
    localStorage.removeItem(CANDIDATE_USER_KEY)
    return null
  }
}

export const useCandidateAuthStore = defineStore('candidateAuth', () => {
  const candidate = ref<Candidate | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem(CANDIDATE_TOKEN_KEY))
  const isHydrated = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)
  const candidateName = computed(() => candidate.value?.fullName ?? '')

  function _setAuth(data: CandidateAuthResponse) {
    candidate.value = data.user
    accessToken.value = data.accessToken
    localStorage.setItem(CANDIDATE_TOKEN_KEY, data.accessToken)
    localStorage.setItem(CANDIDATE_USER_KEY, JSON.stringify(data.user))
  }

  function _clearAuth() {
    candidate.value = null
    accessToken.value = null
    localStorage.removeItem(CANDIDATE_TOKEN_KEY)
    localStorage.removeItem(CANDIDATE_USER_KEY)
  }

  /** Creates the account. Returns the confirmation message — NO token is issued
   *  until the email is verified, so the UI must prompt the user to check mail. */
  async function signupCandidate(
    payload: CandidateSignupRequest,
  ): Promise<CandidateSignupResponse> {
    const { data } = await api.post<CandidateSignupResponse>('/auth/candidate/signup', payload)
    return data
  }

  async function signinCandidate(payload: CandidateSigninRequest): Promise<void> {
    const { data } = await api.post<CandidateAuthResponse>('/auth/candidate/signin', payload)
    _setAuth(data)
  }

  /** Exchanges the emailed verification token for a session (user + JWT). */
  async function verifyEmail(token: string): Promise<void> {
    const { data } = await api.get<CandidateAuthResponse>('/auth/candidate/verify', {
      params: { token },
    })
    _setAuth(data)
  }

  function signoutCandidate(): void {
    _clearAuth()
  }

  /** Rehydrates the session from localStorage. No network call — there is no
   *  candidate `/me` endpoint — so a token without a stored user is treated as
   *  unusable and cleared (the guard then redirects to signin). */
  function hydrate(): void {
    if (isHydrated.value) return
    const token = localStorage.getItem(CANDIDATE_TOKEN_KEY)
    const storedUser = _readStoredUser()
    if (token && storedUser) {
      accessToken.value = token
      candidate.value = storedUser
    } else if (token || storedUser) {
      // Half-present session (one key without the other) — clear to be safe.
      _clearAuth()
    }
    isHydrated.value = true
  }

  return {
    candidate,
    accessToken,
    isHydrated,
    isAuthenticated,
    candidateName,
    signupCandidate,
    signinCandidate,
    verifyEmail,
    signoutCandidate,
    hydrate,
  }
})
