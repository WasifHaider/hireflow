<template>
  <!-- Content only; chrome (app bar + nav) lives in CandidateLayout. -->
  <div class="cand-content">
    <!-- Heading -->
      <div class="cand-head">
        <div>
          <div class="hf-muted" style="font-size: 13px; margin-bottom: 4px">Welcome back, {{ firstName }}</div>
          <h1 class="cand-title">Your applications</h1>
        </div>
        <div class="cand-head-actions">
          <button class="hf-btn ghost"><HfIcon name="search" :size="14" />Find jobs</button>
          <button class="hf-btn primary"><HfIcon name="plus" :size="14" />Add an application</button>
        </div>
      </div>

      <!-- Offer highlight banner -->
      <div class="offer-banner">
        <div style="font-size: 28px">🎉</div>
        <div style="flex: 1">
          <div class="offer-title">You have an offer from Vertex AI Labs</div>
          <div class="offer-sub">ML Infrastructure Engineer · $200k – $250k · Respond by May 20</div>
        </div>
        <button class="hf-btn ghost" style="background: white">View offer<HfIcon name="arrowRight" :size="14" /></button>
      </div>

      <!-- Filter chips -->
      <div class="chips-row">
        <div v-for="c in filters" :key="c.name" class="chip" :class="{ active: c.active }">
          {{ c.name }}
          <span class="chip-count" :class="{ active: c.active }">{{ c.n }}</span>
        </div>
        <div class="sort-wrap">
          <span class="hf-muted" style="font-size: 12px">Sort:</span>
          <div class="hf-btn ghost" style="height: 30px; padding: 0 10px; font-size: 12px">
            Most recent<HfIcon name="chevron" :size="14" />
          </div>
        </div>
      </div>

      <!-- Application list -->
      <div class="app-list">
        <div v-for="a in applications" :key="a.company" class="hf-card app-card">
          <div class="app-top">
            <div class="app-logo" :style="{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)` }">
              {{ a.company[0] }}
            </div>
            <div style="flex: 1; min-width: 0">
              <div class="hf-muted" style="font-size: 12px; font-weight: 500">{{ a.company }}</div>
              <div class="app-role">{{ a.role }}</div>
              <div class="app-meta">
                <span><HfIcon name="map" :size="14" />{{ a.location }}</span>
                <span>💰 {{ a.salary }}</span>
                <span><HfIcon name="cal" :size="14" />Applied {{ a.applied }}</span>
              </div>
            </div>
            <div class="app-fit">
              <span class="hf-score" :class="scoreLevel(a.score)">{{ a.score }}</span>
              <span class="app-fit-label">Your fit</span>
            </div>
          </div>

          <!-- Stage stepper -->
          <div class="stepper">
            <template v-for="(s, i) in stages" :key="s">
              <div class="step">
                <div class="step-dot" :class="{ done: i < a.stage, active: i === a.stage }">
                  <HfIcon v-if="i < a.stage" name="check" :size="10" :stroke="3" />
                </div>
                <div class="step-label" :class="{ on: i <= a.stage, active: i === a.stage }">{{ s }}</div>
              </div>
              <div v-if="i < stages.length - 1" class="step-line" :class="{ done: i < a.stage }" />
            </template>
          </div>

          <!-- Activity footer -->
          <div class="app-foot">
            <div class="app-foot-icon" :class="a.activityKind">
              <template v-if="a.activityKind === 'offer'">🎉</template>
              <HfIcon v-else-if="a.activityKind === 'positive'" name="cal" :size="14" />
              <HfIcon v-else name="clock" :size="13" />
            </div>
            <div style="font-size: 13px; font-weight: 500; flex: 1">{{ a.activity }}</div>
            <button class="hf-btn ghost">View details<HfIcon name="arrowRight" :size="14" /></button>
          </div>
        </div>
      </div>

      <!-- Suggested for you -->
      <div style="margin-top: 8px">
        <div class="suggest-head">
          <h2 class="suggest-title">Jobs we picked for you</h2>
          <span class="hf-tag accent" style="margin-left: 10px">Based on your profile</span>
          <a class="suggest-link">Browse all jobs</a>
        </div>
        <div class="suggest-grid">
          <div v-for="j in suggested" :key="j.co" class="hf-card suggest-card">
            <div style="display: flex; align-items: center; gap: 10px">
              <div class="suggest-logo" :style="{ background: j.c }">{{ j.co[0] }}</div>
              <div style="flex: 1; min-width: 0">
                <div class="hf-muted" style="font-size: 11px">{{ j.co }}</div>
                <div class="suggest-role">{{ j.role }}</div>
              </div>
              <span class="hf-score" :class="scoreLevel(j.match)">{{ j.match }}</span>
            </div>
            <div class="suggest-loc"><span><HfIcon name="map" :size="14" />{{ j.loc }}</span></div>
            <div class="suggest-foot">
              <span style="font-size: 12.5px; font-weight: 500">{{ j.sal }}</span>
              <button class="hf-btn ghost" style="height: 28px; padding: 0 10px; font-size: 12px">Apply<HfIcon name="arrowRight" :size="14" /></button>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCandidateAuthStore } from '@/stores/candidateAuth.store'
import HfIcon from '@/components/common/HfIcon.vue'

/* Candidate dashboard content. Application data is placeholder until
   GET /candidate/me/applications is wired in the backend-integration pass;
   the greeting comes from the candidate store. */
const candidateAuth = useCandidateAuthStore()

const firstName = computed(() => (candidateAuth.candidateName || 'there').split(' ')[0])

const stages = ['Applied', 'Screened', 'Interview', 'Offer', 'Hired']

const applications = [
  { company: 'Northwind Logistics', role: 'Senior Backend Engineer', applied: 'Apr 22, 2026', stage: 3, score: 92, salary: '$180k – $230k', location: 'Austin, TX · Hybrid', activity: 'Interview scheduled for May 14', activityKind: 'positive', color: '#F97316' },
  { company: 'Lumen Health', role: 'Staff Software Engineer, Platform', applied: 'Apr 18, 2026', stage: 2, score: 84, salary: '$210k – $260k', location: 'Remote · USA', activity: 'Recruiter screen — Apr 28', activityKind: 'positive', color: '#0EA5E9' },
  { company: 'Vertex AI Labs', role: 'ML Infrastructure Engineer', applied: 'Apr 15, 2026', stage: 4, score: 88, salary: '$200k – $250k', location: 'San Francisco, CA', activity: 'Offer extended — respond by May 20', activityKind: 'offer', color: '#8B5CF6' },
  { company: 'Cobalt Studio', role: 'Backend Engineer, Payments', applied: 'Apr 03, 2026', stage: 1, score: 78, salary: '$160k – $200k', location: 'New York, NY', activity: 'AI screen passed · waiting on recruiter', activityKind: 'neutral', color: '#10B981' },
]

const filters = [
  { name: 'All', n: 4, active: true },
  { name: 'Active', n: 3 },
  { name: 'Interviewing', n: 1 },
  { name: 'Offers', n: 1 },
  { name: 'Closed', n: 0 },
]

const suggested = [
  { co: 'Mercato', role: 'Principal Backend Engineer', loc: 'Remote · USA', match: 96, sal: '$240k+', c: '#EC4899' },
  { co: 'Foundry Robotics', role: 'Distributed Systems Engineer', loc: 'San Francisco, CA', match: 89, sal: '$210k – $260k', c: '#0F172A' },
  { co: 'Helix Bio', role: 'Senior Platform Engineer', loc: 'Boston, MA · Hybrid', match: 84, sal: '$190k – $240k', c: '#10B981' },
]

function scoreLevel(v: number): string {
  return v >= 80 ? 'high' : v >= 60 ? 'mid' : 'low'
}
</script>

<style scoped>
.cand-content { display: flex; flex-direction: column; gap: 28px; }

.cand-head { display: flex; align-items: flex-end; gap: 16px; }
.cand-head-actions { margin-left: auto; display: flex; gap: 8px; }
.cand-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.025em; }

.offer-banner {
  padding: 18px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fef3c7, #fed7aa);
  border: 1px solid #fde68a;
  display: flex;
  align-items: center;
  gap: 16px;
}
.offer-title { font-size: 14.5px; font-weight: 600; color: #92400e; }
.offer-sub { font-size: 12.5px; color: #b45309; margin-top: 2px; }

.chips-row { display: flex; align-items: center; gap: 8px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 99px;
  background: white;
  border: 1px solid var(--hf-border);
  color: var(--hf-text);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}
.chip.active { background: var(--hf-text); border-color: var(--hf-text); color: white; }
.chip-count {
  font-size: 10.5px;
  font-family: var(--hf-mono);
  background: var(--hf-bg);
  color: var(--hf-text-muted);
  padding: 0 6px;
  border-radius: 5px;
}
.chip-count.active { background: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.85); }
.sort-wrap { margin-left: auto; display: flex; align-items: center; gap: 6px; }

.app-list { display: flex; flex-direction: column; gap: 14px; }
.app-card { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.app-top { display: flex; align-items: flex-start; gap: 14px; }
.app-logo {
  width: 48px;
  height: 48px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}
.app-role { font-size: 15px; font-weight: 600; margin-top: 2px; letter-spacing: -0.01em; }
.app-meta {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--hf-text-muted);
  flex-wrap: wrap;
}
.app-meta span { display: inline-flex; align-items: center; gap: 4px; }
.app-fit { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.app-fit-label {
  font-size: 10.5px;
  color: var(--hf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* Stage stepper */
.stepper { display: flex; align-items: center; width: 100%; }
.step { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
.step-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 1.5px solid var(--hf-border-strong);
  display: grid;
  place-items: center;
  color: white;
}
.step-dot.done { background: var(--hf-accent); border: 0; }
.step-dot.active { border: 2.5px solid var(--hf-accent); }
.step-label { font-size: 10.5px; font-weight: 500; color: var(--hf-text-subtle); white-space: nowrap; }
.step-label.on { color: var(--hf-text); }
.step-label.active { font-weight: 600; }
.step-line { flex: 1; height: 2px; background: var(--hf-border); position: relative; top: -10px; margin: 0 4px; }
.step-line.done { background: var(--hf-accent); }

.app-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--hf-border);
}
.app-foot-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--hf-bg);
  color: var(--hf-text-muted);
}
.app-foot-icon.positive { background: var(--hf-accent-soft); color: #047857; }
.app-foot-icon.offer { background: var(--hf-warn-soft); color: #b45309; }

/* Suggested */
.suggest-head { display: flex; align-items: center; margin-bottom: 14px; }
.suggest-title { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.015em; }
.suggest-link { margin-left: auto; font-size: 12.5px; color: var(--hf-primary); font-weight: 500; cursor: pointer; }
.suggest-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.suggest-card { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.suggest-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 14px;
}
.suggest-role { font-size: 13.5px; font-weight: 600; line-height: 1.2; }
.suggest-loc { display: flex; gap: 8px; font-size: 11.5px; color: var(--hf-text-muted); }
.suggest-loc span { display: inline-flex; align-items: center; gap: 4px; }
.suggest-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--hf-border);
}
</style>
