<template>
  <div class="hf-avatar" :class="size === 'md' ? '' : size" :style="{ background: gradient }">
    {{ initials }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/* Gradient initials avatar, ported from the mockup's <Avatar>. Colour is picked
   deterministically from the name hash so the same person always renders the
   same gradient. Sizes match the mockup: sm 24 / md 30 / lg 56. */
const props = withDefaults(defineProps<{ name: string; size?: 'sm' | 'md' | 'lg' }>(), {
  size: 'md',
})

const PALETTE: [string, string][] = [
  ['#6366F1', '#A78BFA'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#FBBF24'],
  ['#EC4899', '#F472B6'],
  ['#06B6D4', '#22D3EE'],
  ['#8B5CF6', '#A78BFA'],
  ['#EF4444', '#F87171'],
  ['#3B82F6', '#60A5FA'],
  ['#F97316', '#FB923C'],
  ['#14B8A6', '#2DD4BF'],
]

function hashIdx(s: string, mod: number): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h) % mod
}

const initials = computed(() =>
  props.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase(),
)

const gradient = computed(() => {
  const [a, b] = PALETTE[hashIdx(props.name, PALETTE.length)] ?? ['#6366F1', '#A78BFA']
  return `linear-gradient(135deg, ${a}, ${b})`
})
</script>
