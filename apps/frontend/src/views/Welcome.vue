<template>
  <div class="welcome-page">
    <!-- ── Minimal first-run top bar ─────────────────────────────────────────── -->
    <header class="topbar">
      <div class="logo">
        <div class="logo-mark">H</div>
        <span>HireFlow</span>
      </div>
      <div class="topbar-right">
        <span class="signed-in">Signed in as {{ userEmail }}</span>
        <AppButton variant="ghost" @click="handleSignOut">Sign out</AppButton>
      </div>
    </header>

    <main class="welcome-main">
      <!-- ── Hero ──────────────────────────────────────────────────────────── -->
      <div class="hero">
        <div class="hero-mark">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <div>
          <h1 class="hero-title">Welcome to HireFlow, {{ companyName }}.</h1>
          <p class="hero-sub">
            Your workspace is ready. Add a logo, post your first role, and we'll start screening
            candidates with AI within minutes.
          </p>
        </div>
      </div>

      <!-- ── Setup card ────────────────────────────────────────────────────── -->
      <v-card class="setup-card" elevation="0">
        <!-- Section A — Workspace basics -->
        <section>
          <div class="section-head">
            <span class="step-badge">1</span>
            <h3 class="section-title">Your workspace</h3>
            <span class="section-note">You can change everything later in Settings.</span>
          </div>

          <div class="grid-2">
            <AppField v-model="companyName" label="Company name" />

            <!-- Workspace URL — custom composite (prefix box + live availability) -->
            <div class="field">
              <label class="field-label">Workspace URL</label>
              <div class="url-field">
                <span class="url-prefix">hireflow.app /</span>
                <input v-model="workspaceSlug" class="url-input" />
                <span
                  v-if="slugCheckState !== 'idle'"
                  class="url-available"
                  :class="{ taken: slugCheckState === 'taken' }"
                >
                  <span v-if="slugCheckState === 'checking'" class="url-check checking">…</span>
                  <span v-else class="url-check">
                    <svg
                      v-if="slugCheckState === 'available'"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    <svg
                      v-else
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                  {{ slugCheckState === 'checking' ? 'Checking…' : slugCheckState === 'available' ? 'Available' : 'Taken' }}
                </span>
              </div>
            </div>
          </div>

          <p v-if="workspaceSaveError" class="workspace-save-error">{{ workspaceSaveError }}</p>

          <!-- Logo upload row -->
          <div class="logo-row">
            <div class="logo-thumb">{{ logoInitial }}</div>
            <div class="logo-meta">
              <div class="logo-meta-title">Company logo</div>
              <div class="logo-meta-sub">
                PNG or SVG · at least 256×256. Used on your job pages.
              </div>
            </div>
            <AppButton variant="ghost" @click="uploadLogo">
              <v-icon size="14">mdi-tray-arrow-up</v-icon>
              Upload logo
            </AppButton>
          </div>
        </section>

        <!-- Section B — First job -->
        <section class="section--divided">
          <div class="section-head">
            <span class="step-badge">2</span>
            <h3 class="section-title">Post your first job</h3>
            <span class="tag-accent">
              <v-icon size="13">mdi-star-four-points</v-icon>
              AI drafts the description
            </span>
          </div>

          <div class="grid-2 mb-grid">
            <AppField v-model="jobTitle" label="Job title" placeholder="Senior Backend Engineer" />
            <AppField v-model="department" type="select" label="Department" :items="departments" />
          </div>

          <div class="grid-3">
            <AppField v-model="location" label="Location" placeholder="Austin, TX" />
            <AppField v-model="workModel" type="select" label="Work model" :items="workModels" />
            <AppField v-model="salary" label="Salary range" placeholder="$180k – $230k" />
          </div>

          <!-- AI hint / draft trigger -->
          <div class="ai-hint">
            <v-icon color="#4F46E5" size="20">mdi-star-four-points</v-icon>
            <span class="ai-hint-text">
              Skip the writing. We'll generate the description, requirements, and scoring rubric
              from your title in ~15 seconds.
            </span>
            <AppButton
              v-if="!manualMode"
              variant="ghost"
              :loading="generating"
              :disabled="!jobTitle.trim()"
              @click="handleGenerate"
            >
              <v-icon size="14">mdi-star-four-points</v-icon>
              Generate
            </AppButton>
            <AppButton variant="ghost" @click="writeOwn">
              <v-icon size="14">mdi-pencil</v-icon>
              {{ manualMode ? 'Use AI draft instead' : 'Write my own' }}
            </AppButton>
          </div>

          <p v-if="generateError" class="workspace-save-error">{{ generateError }}</p>

          <!-- Generated / manual draft -->
          <div v-if="manualMode || description" class="draft-block">
            <AppField
              v-model="description"
              label="Description"
              placeholder="We are looking for..."
              :disabled="!manualMode && generating"
            />
            <AppField
              v-model="requirements"
              label="Requirements"
              placeholder="- 5+ years experience..."
              :disabled="!manualMode && generating"
            />
          </div>
        </section>

        <!-- Footer actions -->
        <div class="d-flex align-center justify-space-between">
          <a class="skip-link" @click="skipToDashboard">Skip for now — take me to the dashboard</a>
          <AppButton variant="primary" :loading="savingWorkspace" @click="publishJob">
            <v-icon size="16">mdi-star-four-points</v-icon>
            Publish job &amp; start screening
            <v-icon size="16">mdi-arrow-right</v-icon>
          </AppButton>
        </div>
      </v-card>

      <!-- ── What's next ──────────────────────────────────────────────────── -->
      <div class="next-grid">
        <div v-for="f in features" :key="f.title" class="next-card">
          <div class="next-icon">{{ f.icon }}</div>
          <div class="next-title">{{ f.title }}</div>
          <div class="next-sub">{{ f.text }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useJobsStore } from '@/stores/jobs.store'
import { useToastStore } from '@/stores/toast.store'
import { getApiErrorMessage } from '@/plugins/axios'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'
import type { JobType } from '@/types/job'

const router = useRouter()
const authStore = useAuthStore()
const jobsStore = useJobsStore()
const toastStore = useToastStore()

const userEmail = computed(() => authStore.user?.email ?? '')
const logoInitial = computed(() => (authStore.companyName || 'Your Company').charAt(0).toUpperCase())

// ── Step 1: workspace ──────────────────────────────────────────────────────────
// Prefilled from the just-created account; editable here, persisted later in Settings.
const companyName = ref(authStore.companyName || 'Your Company')
const workspaceSlug = ref(authStore.company?.slug || '')
const originalSlug = authStore.company?.slug || ''

// Live workspace-URL availability check, debounced. 'idle' = unchanged from
// the current value or empty (no check needed / nothing to show).
type SlugCheckState = 'idle' | 'checking' | 'available' | 'taken'
const slugCheckState = ref<SlugCheckState>('idle')
const SLUG_PATTERN = /^[a-z0-9-]{2,50}$/
let slugCheckTimer: ReturnType<typeof setTimeout> | undefined
let slugCheckToken = 0

watch(workspaceSlug, (value) => {
  const trimmed = value.trim()
  if (slugCheckTimer) clearTimeout(slugCheckTimer)

  if (!trimmed || trimmed === originalSlug) {
    slugCheckState.value = 'idle'
    return
  }
  if (!SLUG_PATTERN.test(trimmed)) {
    slugCheckState.value = 'taken' // reuse the "taken"/red state to flag invalid format too
    return
  }

  slugCheckState.value = 'checking'
  const myToken = ++slugCheckToken
  slugCheckTimer = setTimeout(async () => {
    try {
      const available = await authStore.checkSlugAvailable(trimmed)
      if (myToken !== slugCheckToken) return // stale response — a newer keystroke superseded it
      slugCheckState.value = available ? 'available' : 'taken'
    } catch {
      if (myToken !== slugCheckToken) return
      slugCheckState.value = 'idle' // network hiccup — don't block typing on a false negative
    }
  }, 400)
})

onBeforeUnmount(() => {
  if (slugCheckTimer) clearTimeout(slugCheckTimer)
})

// ── Step 2: first job ──────────────────────────────────────────────────────────
const jobTitle = ref('')
const department = ref('Engineering')
const location = ref('')
const workModel = ref('Hybrid')
const salary = ref('')
const description = ref('')
const requirements = ref('')
const mustHaveSkills = ref<string[]>([])
const manualMode = ref(false)
const generating = ref(false)
const generateError = ref('')

const WORK_MODEL_TO_JOB_TYPE: Record<string, JobType> = {
  'On-site': 'ONSITE',
  Hybrid: 'HYBRID',
  Remote: 'REMOTE',
}

const departments = [
  'Engineering',
  'Product',
  'Design',
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'People',
]
const workModels = ['On-site', 'Hybrid', 'Remote']

const features = [
  {
    icon: '📨',
    title: 'Receive applications',
    text: 'Share your public job link anywhere — LinkedIn, your site, careers page.',
  },
  {
    icon: '🤖',
    title: 'AI screens every applicant',
    text: 'Each candidate gets a 0–100 fit score within seconds of applying.',
  },
  {
    icon: '👥',
    title: 'Move people through stages',
    text: 'Drag candidates across Applied → Screened → Interview → Offer → Hired.',
  },
]

// ── Actions ──────────────────────────────────────────────────────────────────
const savingWorkspace = ref(false)
const workspaceSaveError = ref('')

// Only PATCH if the recruiter actually edited something from the hydrated
// values — avoids a needless write (and a possible spurious 409) on every
// "Skip"/"Publish" click when nothing changed.
async function saveWorkspaceIfChanged() {
  const nameChanged = companyName.value.trim() !== (authStore.companyName || '')
  const slugChanged = workspaceSlug.value.trim() !== (authStore.company?.slug || '')
  if (!nameChanged && !slugChanged) return

  savingWorkspace.value = true
  workspaceSaveError.value = ''
  try {
    await authStore.updateCompany({
      companyName: nameChanged ? companyName.value.trim() : undefined,
      slug: slugChanged ? workspaceSlug.value.trim() : undefined,
    })
  } catch {
    // Non-blocking: workspace basics are a nice-to-have on this screen: don't
    // trap the recruiter here if the save fails (e.g. slug taken). They can
    // fix it later in Settings.
    workspaceSaveError.value = 'Could not save workspace changes — you can update this later in Settings.'
  } finally {
    savingWorkspace.value = false
  }
}

async function handleSignOut() {
  await authStore.signout()
  router.push('/signin')
}
async function skipToDashboard() {
  await saveWorkspaceIfChanged()
  router.push('/dashboard')
}

async function handleGenerate() {
  if (!jobTitle.value.trim()) return
  generating.value = true
  generateError.value = ''
  try {
    const draft = await jobsStore.generateJobDescription({
      title: jobTitle.value.trim(),
      department: department.value || undefined,
      location: location.value.trim() || undefined,
    })
    description.value = draft.description
    requirements.value = draft.requirements
    mustHaveSkills.value = draft.mustHaveSkills
  } catch (e) {
    generateError.value = getApiErrorMessage(e, 'Could not generate a draft. Try again or write your own.')
  } finally {
    generating.value = false
  }
}

function writeOwn() {
  manualMode.value = !manualMode.value
  generateError.value = ''
}

// Parses "$180k – $230k" / "180000-230000" style input into a [min, max] pair.
// Best-effort: this is a free-text field in the design, not a structured range
// picker, so unparseable input just yields undefined bounds (job still posts).
function parseSalary(raw: string): { min?: number; max?: number } {
  const numbers = raw
    .match(/[\d.]+k?/gi)
    ?.map((token) => {
      const isK = /k$/i.test(token)
      const n = parseFloat(token.replace(/k$/i, ''))
      return isK ? n * 1000 : n
    })
    .filter((n) => !Number.isNaN(n))
  if (!numbers || numbers.length === 0) return {}
  if (numbers.length === 1) return { min: numbers[0] }
  return { min: Math.min(...numbers), max: Math.max(...numbers) }
}

async function publishJob() {
  await saveWorkspaceIfChanged()

  if (!jobTitle.value.trim() || !location.value.trim() || !description.value.trim() || !requirements.value.trim()) {
    // Fields required by the backend aren't filled in — treat as skip rather
    // than blocking the recruiter on this optional onboarding step.
    router.push('/dashboard')
    return
  }

  const { min: salaryMin, max: salaryMax } = parseSalary(salary.value)

  try {
    await jobsStore.createJob({
      title: jobTitle.value.trim(),
      description: description.value.trim(),
      requirements: requirements.value.trim(),
      department: department.value || undefined,
      location: location.value.trim(),
      jobType: WORK_MODEL_TO_JOB_TYPE[workModel.value] ?? 'HYBRID',
      employmentType: 'FULL_TIME',
      salaryMin,
      salaryMax,
      mustHaveSkills: mustHaveSkills.value,
      status: 'PUBLISHED',
    })
    toastStore.show(`"${jobTitle.value.trim()}" was published — AI screening starts as applications come in.`)
  } catch {
    // Non-blocking, matches saveWorkspaceIfChanged's convention: don't trap
    // the recruiter here — they can create the job properly from /jobs/new.
  }

  router.push('/dashboard')
}
function uploadLogo() {
  // TODO(user): open file picker → upload to storage.
}
</script>

<style scoped>
/* ── Page shell ──────────────────────────────────────────────────────────── */
.welcome-page {
  min-height: 100dvh;
  background: #f9fafb;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #111827;
  -webkit-font-smoothing: antialiased;
}

/* ── Top bar ─────────────────────────────────────────────────────────────── */
.topbar {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 32px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #111827;
}
.logo-mark {
  position: relative;
  overflow: hidden;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #4f46e5;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
}
.logo-mark::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 60%);
}
.topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}
.signed-in {
  font-size: 12.5px;
  color: #6b7280;
}

/* ── Main column ─────────────────────────────────────────────────────────── */
.welcome-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 56px 32px 64px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
.hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.hero-mark {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  color: white;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 28px -10px rgba(79, 70, 229, 0.5);
}
.hero-title {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.025em;
}
.hero-sub {
  margin: 10px auto 0;
  font-size: 14.5px;
  color: #6b7280;
  max-width: 540px;
  line-height: 1.55;
}

/* ── Setup card ──────────────────────────────────────────────────────────── */
.setup-card {
  padding: 36px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  background: white;
  border: 1px solid #e5e7eb !important;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04) !important;
}
.section--divided {
  padding-top: 28px;
  border-top: 1px solid #e5e7eb;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.step-badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #4f46e5;
  color: white;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  flex-shrink: 0;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}
.section-note {
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
}

/* ── Grids ───────────────────────────────────────────────────────────────── */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.mb-grid {
  margin-bottom: 16px;
}

/* ── Field label (shared with AppField look) ─────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

/* ── Workspace URL composite ─────────────────────────────────────────────── */
.url-field {
  display: flex;
  align-items: center;
  height: 44px;
  border: 1px solid #a3a4a8;
  border-radius: 9px;
  overflow: hidden;
  background: white;
}
.url-prefix {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  font-size: 13.5px;
  color: #6b7280;
}
.url-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  background: transparent;
}
.url-available {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-right: 14px;
  font-size: 11.5px;
  color: #047857;
  font-weight: 500;
  white-space: nowrap;
}
.url-available.taken {
  color: #b91c1c;
}
.url-check {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ecfdf5;
  color: #047857;
  display: grid;
  place-items: center;
}
.url-check.checking {
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 10px;
}
.url-available.taken .url-check {
  background: #fef2f2;
  color: #b91c1c;
}

.workspace-save-error {
  margin: -10px 0 0;
  font-size: 12.5px;
  color: #ef4444;
}

/* ── Logo row ────────────────────────────────────────────────────────────── */
.logo-row {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 18px;
}
.logo-thumb {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f97316, #fb923c);
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 22px;
  flex-shrink: 0;
}
.logo-meta {
  flex: 1;
}
.logo-meta-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.logo-meta-sub {
  font-size: 12.5px;
  color: #6b7280;
}

/* ── Accent tag ──────────────────────────────────────────────────────────── */
.tag-accent {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

/* ── AI hint ─────────────────────────────────────────────────────────────── */
.ai-hint {
  margin-top: 14px;
  padding: 14px;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.ai-hint-text {
  flex: 1;
  font-size: 12.5px;
  color: #4f46e5;
  line-height: 1.5;
  font-weight: 500;
}

.draft-block {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Card footer ─────────────────────────────────────────────────────────── */
.card-foot {
  display: flex;
  align-items: center;
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}
.skip-link {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
}
.skip-link:hover {
  color: #4f46e5;
}

/* ── What's next ─────────────────────────────────────────────────────────── */
.next-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.next-card {
  padding: 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.next-icon {
  font-size: 22px;
}
.next-title {
  font-size: 13.5px;
  font-weight: 600;
  margin-top: 8px;
}
.next-sub {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
