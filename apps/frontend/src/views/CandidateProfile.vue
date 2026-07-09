<template>
  <div class="profile">
    <header class="profile-head">
      <h1 class="profile-title">Profile</h1>
      <p class="profile-sub">Manage the details recruiters see when you apply.</p>
    </header>

    <!-- Loading -->
    <div v-if="loading && !profile" class="hf-card" style="padding: 28px">
      <div class="sk-line" style="width: 40%; height: 20px" />
      <div class="sk-line" style="width: 100%; height: 44px; margin-top: 20px" />
      <div class="sk-line" style="width: 100%; height: 44px; margin-top: 14px" />
    </div>

    <!-- Error -->
    <div v-else-if="error && !profile" class="hf-card profile-state">
      <p class="hf-muted">{{ error }}</p>
      <AppButton variant="ghost" @click="store.fetchProfile()">Try again</AppButton>
    </div>

    <template v-else-if="profile">
      <!-- Identity summary -->
      <div class="hf-card identity-card">
        <div class="identity-avatar">{{ initials }}</div>
        <div class="identity-main">
          <div class="identity-name-row">
            <span class="identity-name">{{ profile.fullName }}</span>
            <span v-if="profile.emailVerified" class="verified"><HfIcon name="check" :size="12" /> Verified</span>
            <span v-else class="unverified">Unverified</span>
          </div>
          <span class="identity-email">{{ profile.email }}</span>
          <span class="identity-since">Member since {{ memberSince }}</span>
        </div>
        <div class="identity-stat">
          <span class="stat-num">{{ profile.applicationCount }}</span>
          <span class="stat-lbl">Application{{ profile.applicationCount === 1 ? '' : 's' }}</span>
        </div>
      </div>

      <!-- Edit form -->
      <form class="hf-card edit-card" @submit.prevent="handleSave">
        <h2 class="edit-title">Personal details</h2>

        <div v-if="saveError" class="form-alert">{{ saveError }}</div>
        <div v-if="saved" class="form-ok"><HfIcon name="check" :size="14" /> Profile updated.</div>

        <AppField
          v-model="fullName"
          label="Full name"
          placeholder="Your name"
          :error="fullNameError"
          @blur="validate"
        />

        <div class="field readonly">
          <label class="field-label">Email</label>
          <div class="readonly-value">
            {{ profile.email }}
            <span class="readonly-note">can’t be changed</span>
          </div>
        </div>

        <AppField v-model="phone" label="Phone (optional)" placeholder="(555) 000-0000" />
        <AppField
          v-model="linkedinUrl"
          label="LinkedIn URL (optional)"
          placeholder="linkedin.com/in/you"
          :error="linkedinError"
          @blur="validate"
        />

        <div class="edit-actions">
          <AppButton variant="ghost" type="button" :disabled="!dirty || saving" @click="reset">
            Discard
          </AppButton>
          <AppButton type="submit" :loading="saving" :disabled="!dirty">Save changes</AppButton>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCandidateProfileStore } from '@/stores/candidateProfile.store'
import { getApiErrorMessage } from '@/plugins/axios'
import AppField from '@/components/common/AppField.vue'
import AppButton from '@/components/common/AppButton.vue'
import HfIcon from '@/components/common/HfIcon.vue'

const store = useCandidateProfileStore()
const { profile, loading, error } = storeToRefs(store)

const fullName = ref('')
const phone = ref('')
const linkedinUrl = ref('')
const fullNameError = ref('')
const linkedinError = ref('')
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

const initials = computed(() => (profile.value?.fullName || 'U').charAt(0).toUpperCase())
const memberSince = computed(() =>
  profile.value
    ? new Date(profile.value.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '',
)

// Seed the form from the loaded profile.
function seed() {
  fullName.value = profile.value?.fullName ?? ''
  phone.value = profile.value?.phone ?? ''
  linkedinUrl.value = profile.value?.linkedinUrl ?? ''
}
watch(profile, seed, { immediate: true })

const dirty = computed(
  () =>
    !!profile.value &&
    (fullName.value.trim() !== profile.value.fullName ||
      phone.value.trim() !== (profile.value.phone ?? '') ||
      linkedinUrl.value.trim() !== (profile.value.linkedinUrl ?? '')),
)

function validate(): boolean {
  fullNameError.value = fullName.value.trim().length < 2 ? 'Please enter your full name' : ''
  const url = linkedinUrl.value.trim()
  // Optional, but if present must look like a URL (matches backend @IsUrl).
  linkedinError.value =
    url && !/^https?:\/\/.+\..+/.test(url) && !/^[\w-]+\.[\w./-]+/.test(url)
      ? 'Enter a valid URL'
      : ''
  return !fullNameError.value && !linkedinError.value
}

function reset() {
  seed()
  fullNameError.value = ''
  linkedinError.value = ''
  saveError.value = ''
}

async function handleSave() {
  saved.value = false
  saveError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    await store.updateProfile({
      fullName: fullName.value.trim(),
      phone: phone.value.trim() || null,
      linkedinUrl: linkedinUrl.value.trim() || null,
    })
    saved.value = true
  } catch (err) {
    saveError.value = getApiErrorMessage(err, 'Could not save your changes.')
  } finally {
    saving.value = false
  }
}

onMounted(() => store.fetchProfile())
</script>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.profile-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--hf-text);
}
.profile-sub {
  margin-top: 4px;
  font-size: 14px;
  color: var(--hf-text-muted);
}

/* Identity card */
.identity-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 24px;
}
.identity-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--hf-primary);
  color: white;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 600;
  flex-shrink: 0;
}
.identity-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.identity-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.identity-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--hf-text);
}
.verified {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #047857;
  background: var(--hf-accent-soft);
  padding: 2px 8px;
  border-radius: 999px;
}
.unverified {
  font-size: 11px;
  font-weight: 600;
  color: #b45309;
  background: #fef3c7;
  padding: 2px 8px;
  border-radius: 999px;
}
.identity-email {
  font-size: 13.5px;
  color: var(--hf-text-muted);
}
.identity-since {
  font-size: 12px;
  color: var(--hf-text-subtle);
}
.identity-stat {
  margin-left: auto;
  text-align: center;
  padding-left: 18px;
  border-left: 1px solid var(--hf-border);
}
.stat-num {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--hf-text);
  font-family: var(--hf-mono);
}
.stat-lbl {
  font-size: 12px;
  color: var(--hf-text-muted);
}

/* Edit card */
.edit-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}
.edit-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-text);
}
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
.readonly-value {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--hf-border);
  border-radius: 9px;
  background: var(--hf-bg);
  font-size: 14px;
  color: var(--hf-text-muted);
}
.readonly-note {
  font-size: 11.5px;
  color: var(--hf-text-subtle);
}
.form-alert {
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13px;
  color: #b91c1c;
}
.form-ok {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--hf-accent-soft);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #047857;
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.profile-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 20px;
}

.sk-line {
  border-radius: 6px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: sk 1.4s ease infinite;
}
@keyframes sk {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
