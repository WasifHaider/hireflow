<template>
  <v-data-table
    class="app-data-table"
    :headers="headers"
    :items="rows as Row[]"
    :item-value="itemValue"
    :density="density"
    :items-per-page="itemsPerPage ?? (paginated ? 10 : -1)"
    :hide-default-footer="!paginated"
    @click:row="(_e: Event, ctx: { item: Row }) => emit('row-click', ctx.item)"
  >
    <!-- Render every configured column from its `type` -->
    <template v-for="c in columns" #[`item.${c.key}`]="{ item }" :key="c.key">
      <!-- Caller override wins -->
      <slot v-if="$slots[`item.${c.key}`]" :name="`item.${c.key}`" :item="item" />

      <!-- avatar: gradient initials + name + sub line -->
      <div v-else-if="c.type === 'avatar'" class="hf-cand">
        <span class="hf-avatar">{{ avatarInitials(text(item, c)) }}</span>
        <div>
          <div class="hf-cand-name">{{ text(item, c) }}</div>
          <div v-if="c.subField" class="hf-cand-sub">{{ sub(item, c) }}</div>
        </div>
      </div>

      <!-- twoLine: primary + muted secondary -->
      <template v-else-if="c.type === 'twoLine'">
        <div style="font-size: 13px">{{ text(item, c) }}</div>
        <div v-if="c.subField" class="hf-cand-sub">{{ sub(item, c) }}</div>
      </template>

      <span v-else-if="c.type === 'score'" class="hf-score" :class="scoreLevel(val(item, c))">
        {{ text(item, c) }}
      </span>

      <span v-else-if="c.type === 'stage'" class="hf-stage" :class="text(item, c).toLowerCase()">
        {{ text(item, c) }}
      </span>

      <span v-else-if="c.type === 'muted'" class="hf-muted" style="font-size: 12.5px">
        {{ text(item, c) }}
      </span>

      <button
        v-else-if="c.type === 'action'"
        class="hf-btn ghost app-dt-action"
        @click.stop="emit('action', { column: c, row: item })"
      >
        {{ c.actionLabel ?? 'View' }}<HfIcon name="arrowRight" :size="14" />
      </button>

      <span v-else>{{ text(item, c) }}</span>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'

/* Reusable data table styled to the HireFlow design (mockup hf-table look).
   Callers pass `columns` (presentation config) + `rows`; the table renders each
   cell itself from the column `type`, so no per-cell slot boilerplate is needed.
   Escape hatch: declare `#item.<key>` and the table yields that cell to you. */

type Row = Record<string, unknown>

export type Column = {
  key: string
  title?: string
  /** How the cell renders. Defaults to 'text'. */
  type?: 'text' | 'twoLine' | 'avatar' | 'score' | 'stage' | 'muted' | 'action'
  /** Row field for the primary value. Defaults to `key`. */
  field?: string
  /** Row field for the secondary line (avatar/twoLine types). */
  subField?: string
  /** Button label for type 'action'. Defaults to 'View'. */
  actionLabel?: string
  align?: 'start' | 'end' | 'center'
  width?: number | string
  sortable?: boolean
}

const props = withDefaults(
  defineProps<{
    columns: Column[]
    rows: readonly Row[]
    itemValue?: string
    density?: 'default' | 'comfortable' | 'compact'
    paginated?: boolean
    itemsPerPage?: number
  }>(),
  {
    itemValue: undefined,
    density: 'comfortable',
    paginated: false,
    itemsPerPage: undefined,
  },
)

const emit = defineEmits<{
  (e: 'row-click', row: Row): void
  (e: 'action', payload: { column: Column; row: Row }): void
}>()

// Vuetify headers derived from the column config.
const headers = computed(() =>
  props.columns.map((c) => ({
    title: c.title ?? '',
    key: c.key,
    sortable: c.sortable ?? false,
    align: c.align ?? 'start',
    width: c.width,
  })),
)

function val(row: Row, c: Column): unknown {
  return row[c.field ?? c.key]
}
function text(row: Row, c: Column): string {
  const v = val(row, c)
  return v == null ? '' : String(v)
}
function sub(row: Row, c: Column): string {
  if (!c.subField) return ''
  const v = row[c.subField]
  return v == null ? '' : String(v)
}
function scoreLevel(v: unknown): string {
  const n = Number(v)
  return n >= 80 ? 'high' : n >= 60 ? 'mid' : 'low'
}
function avatarInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<style scoped>
.app-data-table {
  background: transparent;
  font-family: var(--hf-font);
}
.app-data-table :deep(table) { border-collapse: collapse; }
.app-data-table :deep(thead th) {
  padding: 10px 16px !important;
  height: auto !important;
  font-weight: 500 !important;
  color: var(--hf-text-muted) !important;
  font-size: 11.5px !important;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--hf-border) !important;
  background: var(--hf-surface-alt);
}
.app-data-table :deep(thead th:first-child) { padding-left: 20px !important; }
.app-data-table :deep(tbody td) {
  padding: 12px 16px !important;
  height: auto !important;
  font-size: 13px;
  border-bottom: 1px solid var(--hf-border) !important;
}
.app-data-table :deep(tbody td:first-child) { padding-left: 20px !important; }
.app-data-table :deep(tbody td:last-child) { text-align: right; padding-right: 16px !important; }
.app-data-table :deep(tbody tr:last-child td) { border-bottom: 0 !important; }
.app-data-table :deep(tbody tr:hover td) { background: var(--hf-surface-alt); }
.app-data-table :deep(tbody tr) { cursor: pointer; }
.app-data-table :deep(.v-data-table__td--align-end) { text-align: right; }

.app-dt-action { height: 28px; padding: 0 8px; font-size: 12px; }
</style>
