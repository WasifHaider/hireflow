<template>
  <aside class="preview">
    <div class="preview-head">
      <div class="eyebrow">Live preview</div>
      <span class="hf-muted url">{{ careersUrl }}</span>
    </div>

    <div class="hf-card frame">
      <!-- Fake browser chrome -->
      <div class="chrome">
        <span class="dot" style="background: #ef4444" />
        <span class="dot" style="background: #f59e0b" />
        <span class="dot" style="background: #10b981" />
        <div class="addr">{{ careersUrl }}</div>
      </div>

      <div class="page">
        <div class="brand">
          <div class="brand-logo">{{ companyInitial }}</div>
          <div class="brand-name">{{ companyName }}</div>
        </div>

        <div class="dept">{{ form.department || 'Department' }}</div>
        <h2 class="title">{{ form.title || 'Job title' }}</h2>

        <div class="tags">
          <span class="hf-tag neutral t">{{ form.location || 'Location' }} · {{ jobTypeLabel }}</span>
          <span class="hf-tag neutral t">{{ employmentLabel }}</span>
          <span v-if="salaryText" class="hf-tag neutral t">{{ salaryText }}</span>
        </div>

        <div class="divider" />

        <div class="section-label">About the role</div>
        <p v-if="form.description" class="body-text">{{ form.description }}</p>
        <template v-else>
          <div class="skeleton" />
          <div class="skeleton" style="width: 92%" />
          <div class="skeleton" style="width: 78%; margin-bottom: 16px" />
        </template>

        <div class="section-label">What we're looking for</div>
        <div v-if="form.mustHaveSkills.length" class="bullets">
          <div v-for="s in form.mustHaveSkills" :key="s" class="bullet">
            <span class="bullet-dot" />{{ s }}
          </div>
        </div>
        <div v-else class="hf-help">Add must-have skills to populate this list.</div>

        <button class="hf-btn primary apply" type="button">
          Apply now<HfIcon name="arrowRight" :size="14" />
        </button>
      </div>
    </div>

    <div class="foot">
      <HfIcon name="sparkles" :size="13" />
      Updates as you type — no save needed
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'
import { useAuthStore } from '@/stores/auth.store'
import { type JobFormState, JOB_TYPE_LABELS, EMPLOYMENT_LABELS } from '@/types/job'

const props = defineProps<{ form: JobFormState }>()
const authStore = useAuthStore()

const companyName = computed(() => authStore.companyName || 'Your company')
const companyInitial = computed(() => companyName.value.charAt(0).toUpperCase())
const jobTypeLabel = computed(() => JOB_TYPE_LABELS[props.form.jobType])
const employmentLabel = computed(() => EMPLOYMENT_LABELS[props.form.employmentType])

const slug = computed(() =>
  (props.form.title || 'new-role')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
)
const careersUrl = computed(() => `careers/${slug.value}`)

const salaryText = computed(() => {
  const { salaryMin, salaryMax } = props.form
  if (!salaryMin && !salaryMax) return ''
  const k = (s: string) => {
    const n = Number(s.replace(/[^0-9.]/g, ''))
    return Number.isNaN(n) ? '?' : `$${Math.round(n / 1000)}k`
  }
  return `${k(salaryMin)}–${k(salaryMax)}`
})
</script>

<style scoped>
.preview {
  position: sticky;
  top: 24px;
  align-self: flex-start;
}
.preview-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: var(--hf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.url {
  font-size: 11.5px;
}
.frame {
  overflow: hidden;
  border-radius: 12px;
}
.chrome {
  height: 28px;
  background: #f3f4f6;
  border-bottom: 1px solid var(--hf-border);
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 6px;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.addr {
  flex: 1;
  margin: 0 10px;
  height: 16px;
  background: #fff;
  border-radius: 4px;
  font-size: 10px;
  color: var(--hf-text-subtle);
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  white-space: nowrap;
}
.page {
  padding: 20px 22px;
  background: #fbfaf7;
  min-height: 480px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.brand-logo {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, #4f46e5, #a78bfa);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
}
.brand-name {
  font-size: 13px;
  font-weight: 600;
}
.dept {
  font-size: 11px;
  color: var(--hf-text-muted);
  margin-bottom: 6px;
}
.title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.tags {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.tags .t {
  font-size: 10px;
  height: 20px;
}
.divider {
  height: 1px;
  background: var(--hf-border);
  margin: 18px 0;
}
.section-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}
.body-text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--hf-text);
  margin: 0 0 16px;
  white-space: pre-wrap;
}
.skeleton {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  margin-bottom: 6px;
}
.bullets {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bullet {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 11.5px;
}
.bullet-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--hf-text-subtle);
}
.apply {
  margin-top: 16px;
  width: 100%;
  height: 36px;
  justify-content: center;
}
.foot {
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--hf-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}
</style>
