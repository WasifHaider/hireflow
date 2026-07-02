<template>
  <div class="detail-page">
    <!-- Back -->
    <button class="back" @click="router.push('/candidates')">
      <HfIcon name="chevronLeft" :size="16" />Back to candidates
    </button>

    <!-- Loading skeleton -->
    <div v-if="loading" class="hf-card detail-card">
      <v-skeleton-loader type="article, paragraph" />
    </div>

    <!-- Not found -->
    <div v-else-if="!candidate" class="hf-card detail-card empty">
      Candidate not found.
    </div>

    <!-- Content -->
    <template v-else>
      <div class="hf-card detail-card">
        <!-- Identity -->
        <div class="identity">
          <span class="hf-avatar lg">{{ initials }}</span>
          <div class="ident-main">
            <h2 class="ident-name">{{ candidate.candidate.fullName }}</h2>
            <div class="hf-muted ident-role">Applying for {{ candidate.job.title }}</div>
            <div class="ident-contacts">
              <span><HfIcon name="mail" :size="13" />{{ candidate.candidate.email }}</span>
              <span v-if="candidate.candidate.phone"><HfIcon name="phone" :size="13" />{{ candidate.candidate.phone }}</span>
              <a v-if="candidate.candidate.linkedinUrl" :href="candidate.candidate.linkedinUrl" target="_blank" rel="noopener">
                <HfIcon name="link" :size="13" />LinkedIn
              </a>
            </div>
          </div>
          <span class="hf-stage" :class="candidate.currentStage.toLowerCase()">
            {{ STAGE_LABELS[candidate.currentStage] }}
          </span>
        </div>
      </div>

      <!-- AI fit + timeline -->
      <div class="two-col">
        <div class="hf-card panel">
          <div class="panel-title">AI fit</div>
          <CandidateFitRing :score="candidate.aiFitScore" :model="scoreModel" />
        </div>
        <div class="hf-card panel">
          <div class="panel-title">Application timeline</div>
          <CandidateTimeline :applied-at="candidate.appliedAt" :current-stage="candidate.currentStage" />
        </div>
      </div>

      <!-- Resume -->
      <div class="hf-card panel">
        <CandidateResumePanel
          :text="candidate.resumeText"
          :filename="candidate.resumeFilename"
          :downloading="downloading"
          @download="onDownload"
        />
      </div>
    </template>

    <v-snackbar v-model="snack.open" :timeout="2600" location="bottom end">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCandidatesStore } from '@/stores/candidates.store'
import type { CandidateDetail } from '@/types/candidate'
import { STAGE_LABELS } from '@/types/candidate'
import CandidateFitRing from '@/components/candidates/CandidateFitRing.vue'
import CandidateResumePanel from '@/components/candidates/CandidateResumePanel.vue'
import CandidateTimeline from '@/components/candidates/CandidateTimeline.vue'
import HfIcon from '@/components/common/HfIcon.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const store = useCandidatesStore()

const candidate = ref<CandidateDetail | null>(null)
const loading = ref(true)
const downloading = ref(false)
const snack = reactive({ open: false, text: '' })

const initials = computed(() =>
  (candidate.value?.candidate.fullName ?? '')
    .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
)
const scoreModel = computed(() => candidate.value?.aiScoreDetails?.model)

async function onDownload() {
  if (!candidate.value) return
  downloading.value = true
  try {
    const url = await store.fetchResumeUrl(candidate.value.id)
    window.open(url, '_blank', 'noopener')
  } catch {
    snack.text = 'Failed to open resume.'
    snack.open = true
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  try {
    candidate.value = await store.fetchCandidate(props.id)
  } catch {
    candidate.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail-page { display: flex; flex-direction: column; gap: 18px; max-width: 920px; }
.back {
  display: inline-flex; align-items: center; gap: 4px;
  background: none; border: 0; cursor: pointer;
  font-size: 13px; color: var(--hf-text-muted); padding: 0;
}
.back:hover { color: var(--hf-text); }
.detail-card { padding: 22px; }
.detail-card.empty { text-align: center; color: var(--hf-text-muted); font-size: 13px; }
.identity { display: flex; gap: 16px; align-items: flex-start; }
.hf-avatar.lg { width: 56px; height: 56px; font-size: 18px; }
.ident-main { flex: 1; }
.ident-name { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
.ident-role { margin-top: 4px; font-size: 13px; }
.ident-contacts { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; font-size: 12.5px; color: var(--hf-text-muted); }
.ident-contacts span, .ident-contacts a { display: inline-flex; align-items: center; gap: 5px; color: inherit; text-decoration: none; }
.ident-contacts a:hover { color: var(--hf-primary); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.panel { padding: 22px; }
.panel-title { font-size: 13px; font-weight: 600; margin-bottom: 16px; }
</style>
