<template>
  <div class="field" :class="{ 'field--error': !!error }">
    <div v-if="label || $slots['label-action']" class="field-head">
      <label v-if="label" class="field-label">{{ label }}</label>
      <slot name="label-action" />
    </div>

    <!-- Autocomplete -->
    <v-autocomplete
      v-if="type === 'autocomplete'"
      v-model="model"
      variant="outlined"
      :items="items"
      :placeholder="placeholder"
      :disabled="disabled"
      persistent-placeholder
      multiple
      :menu-props="menuProps"
      @blur="emit('blur')"
    />

    <!-- Select -->
    <v-select
      v-else-if="type === 'select'"
      v-model="model"
      variant="outlined"
      :items="items"
      :placeholder="placeholder"
      :disabled="disabled"
      persistent-placeholder
      :menu-props="menuProps"
      @blur="emit('blur')"
    />

    <!-- Text / email / password -->
    <div v-else class="input-wrap">
      <v-text-field
        v-model="model"
        :type="inputType"
        variant="outlined"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :prefix="prefix"
        @blur="emit('blur')"
        @keyup.enter="emit('enter')"
      >
        <template v-if="$slots.append" #append-inner>
          <slot name="append" />
        </template>
      </v-text-field>
      <button
        v-if="type === 'password'"
        type="button"
        class="eye-btn"
        tabindex="-1"
        @click="showPassword = !showPassword"
      >
        <svg
          v-if="!showPassword"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <svg
          v-else
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
          />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </button>
    </div>

    <span v-if="error" class="field-err">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useId } from 'vue'

type FieldType = 'text' | 'email' | 'password' | 'select' | 'autocomplete'

const props = withDefaults(
  defineProps<{
    type?: FieldType
    label?: string
    placeholder?: string
    /** options — required for type="select" | "autocomplete" */
    items?: readonly unknown[]
    error?: string
    autocomplete?: string
    disabled?: boolean
    /** static text rendered inside the field, before the input (e.g. a URL prefix) */
    prefix?: string
  }>(),
  {
    type: 'text',
    label: '',
    placeholder: '',
    items: () => [],
    error: '',
    autocomplete: undefined,
    disabled: false,
    prefix: undefined,
  },
)

const emit = defineEmits<{ blur: []; enter: [] }>()

defineSlots<{
  /** trailing content on the label row — e.g. a "Forgot password?" link */
  'label-action'(): unknown
  /** content rendered at the inner-end of a text field — e.g. a status chip */
  append(): unknown
}>()

// Two-way binding. Typed loosely — the same component backs string inputs and
// arbitrary select/autocomplete values.
const model = defineModel<unknown>()

const showPassword = ref(false)
const menuClass = `hf-select-menu-${useId()}`

// password fields flip between text/password on eye-toggle
const inputType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  if (props.type === 'email') return 'email'
  return 'text'
})

const menuProps = computed(() => ({ contentClass: `hf-select-menu ${menuClass}` }))
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}
.field-err {
  font-size: 12px;
  color: #ef4444;
}

/* password eye toggle (only the text variant uses .input-wrap) */
.input-wrap {
  position: relative;
}
.eye-btn {
  position: absolute;
  right: 12px;
  top: 22px; /* center of the 44px field */
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
}
.eye-btn:hover {
  color: #6b7280;
}

/* ── Vuetify field overrides ─────────────────────────────────────────────── */
:deep(.v-field) {
  border-radius: 9px;
  box-shadow: none;
}
:deep(.v-field--variant-outlined .v-field__outline__start),
:deep(.v-field--variant-outlined .v-field__outline__end),
:deep(.v-field--variant-outlined .v-field__outline__notch::before),
:deep(.v-field--variant-outlined .v-field__outline__notch::after) {
  border-color: #a3a4a8;
}
:deep(.v-field--focused .v-field__outline) {
  --v-field-border-width: 1px;
}
:deep(.v-input__details) {
  display: none; /* kill reserved hint/error space — we render our own */
}
:deep(.v-field__input) {
  min-height: 44px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 14px;
}
:deep(.v-select .v-field .v-field__input > input),
:deep(.v-autocomplete .v-field .v-field__input > input) {
  align-self: center !important;
}

/* error state — red outline */
.field--error :deep(.v-field--variant-outlined .v-field__outline__start),
.field--error :deep(.v-field--variant-outlined .v-field__outline__end),
.field--error :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.field--error :deep(.v-field--variant-outlined .v-field__outline__notch::after) {
  border-color: #ef4444;
}
</style>

<style>
.hf-select-menu {
  border-radius: 14px !important;
  overflow: hidden;
  box-shadow:
    0 10px 30px rgba(17, 24, 39, 0.12),
    0 2px 6px rgba(17, 24, 39, 0.06) !important;
  border: 1px solid #ececf1;
}
.hf-select-menu .v-list {
  padding: 6px;
  border-radius: 14px;
  background: white;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.hf-select-menu .v-list::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none; /* Chrome/Safari */
}
.hf-select-menu .v-list-item {
  border-radius: 9px;
  min-height: 40px;
  margin: 2px 0;
  color: #374151;
  transition:
    background 0.12s,
    color 0.12s;
}
.hf-select-menu .v-list-item:hover {
  background: #eef2ff;
  color: #4f46e5;
}
.hf-select-menu .v-list-item--active,
.hf-select-menu .v-list-item[aria-selected='true'] {
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 600;
}
.hf-select-menu .v-list-item__overlay {
  display: none; /* kill Vuetify's default grey hover/active wash */
}
.hf-select-menu .v-list-item-title {
  font-size: 14px;
  letter-spacing: -0.01em;
}
</style>
