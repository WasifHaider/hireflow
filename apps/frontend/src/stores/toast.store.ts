import { defineStore } from 'pinia'
import { ref } from 'vue'

// Minimal global toast queue — a single active message at a time (matches the
// existing per-page v-snackbar pattern used in JobsList/CandidatesList/CandidateDetail),
// but reachable from anywhere (layout-level, background pollers) instead of
// being scoped to one view's local state.
export const useToastStore = defineStore('toast', () => {
  const open = ref(false)
  const text = ref('')

  function show(message: string) {
    text.value = message
    open.value = true
  }

  return { open, text, show }
})
