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

// Candidate sessions are kept under a SEPARATE key from the recruiter token
// (`access_token`) so the two flows never collide. Full session hydration +
// request-interceptor wiring lands with the candidate dashboard phase; for now
// this store owns signup/signin and persists the token for that later work.
const CANDIDATE_TOKEN_KEY = 'candidate_access_token'

export const useCandidateAuthStore = defineStore('candidateAuth', () => {
  const candidate = ref<Candidate | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem(CANDIDATE_TOKEN_KEY))

  const isAuthenticated = computed(() => !!accessToken.value)
  const candidateName = computed(() => candidate.value?.fullName ?? '')

  function _setAuth(data: CandidateAuthResponse) {
    candidate.value = data.user
    accessToken.value = data.accessToken
    localStorage.setItem(CANDIDATE_TOKEN_KEY, data.accessToken)
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

  function signoutCandidate(): void {
    candidate.value = null
    accessToken.value = null
    localStorage.removeItem(CANDIDATE_TOKEN_KEY)
  }

  return {
    candidate,
    accessToken,
    isAuthenticated,
    candidateName,
    signupCandidate,
    signinCandidate,
    signoutCandidate,
  }
})
