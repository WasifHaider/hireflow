<template>
  <v-data-table-server
    class="app-data-table"
    :headers="headers"
    :items="rows"
    :items-length="itemsLength"
    :item-value="itemValue"
    :density="density"
    :page="page"
    :items-per-page="resolvedItemsPerPage"
    :items-per-page-options="itemsPerPageOptions"
    :loading="loading"
    :sort-by="sortBy"
    :hide-default-footer="!server"
    @update:options="onOptions"
    @click:row="(_e: Event, ctx: { item: Row }) => emit('row-click', ctx.item as Row)"
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

    <!-- Loading: skeleton rows (project rule — every fetch shows a loading state) -->
    <template #loading>
      <v-skeleton-loader :type="`table-row@${skeletonRows}`" />
    </template>

    <!-- Empty: caller-overridable via the `empty` slot -->
    <template #no-data>
      <div class="app-dt-empty"><slot name="empty">No data.</slot></div>
    </template>
  </v-data-table-server>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/common/HfIcon.vue'

/* Reusable data table styled to the HireFlow design (mockup hf-table look),
   backed by Vuetify's v-data-table-server so it works for BOTH:
   - static lists (omit `serverItemsLength`): all rows on one page, no footer.
   - server-driven lists (pass `serverItemsLength` + `page`/`loading`/`sortBy`):
     pagination footer, loading skeleton, and sort emits via `update:options`.
   Callers pass `columns` (presentation config) + `rows`; the table renders each
   cell from the column `type`. Escape hatch: declare `#item.<key>` to own a cell;
   `#empty` overrides the no-data message. */

type Row = Record<string, unknown>

export type SortItem = { key: string; order: 'asc' | 'desc' }

/** Subset of Vuetify's v-data-table-server `update:options` payload we forward. */
export type DataTableOptions = {
  page: number
  itemsPerPage: number
  sortBy: SortItem[]
}

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
    /* A generic table accepts rows of any shape (concrete interfaces like
       JobListItem can't satisfy Record<string, unknown> due to TS index-signature
       rules) — mirrors Vuetify's own v-data-table `items: any[]` typing. Callers
       keep their own row types; cell access goes through the typed helpers below. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: readonly any[]
    itemValue?: string
    density?: 'default' | 'comfortable' | 'compact'
    loading?: boolean
    /** Total server-side row count. Provide to enable server pagination + footer. */
    serverItemsLength?: number
    page?: number
    itemsPerPage?: number
    /** Controlled sort state (server mode). */
    sortBy?: SortItem[]
    itemsPerPageOptions?: { value: number; title: string }[]
  }>(),
  {
    itemValue: undefined,
    density: 'comfortable',
    loading: false,
    serverItemsLength: undefined,
    page: 1,
    itemsPerPage: undefined,
    sortBy: () => [],
    itemsPerPageOptions: () => [
      { value: 10, title: '10' },
      { value: 25, title: '25' },
      { value: 50, title: '50' },
    ],
  },
)

const emit = defineEmits<{
  // row is `any` for the same generic-table reason as the `rows` prop above.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (e: 'row-click', row: any): void
  (e: 'action', payload: { column: Column; row: any }): void
  /* eslint-enable @typescript-eslint/no-explicit-any */
  (e: 'update:options', options: DataTableOptions): void
}>()

// Server mode iff the caller gave us a server total to page against.
const server = computed(() => props.serverItemsLength !== undefined)
const itemsLength = computed(() => props.serverItemsLength ?? props.rows.length)
// Static mode shows everything on one page (no -1 reliance); server mode defaults to 10.
const resolvedItemsPerPage = computed(() =>
  server.value ? (props.itemsPerPage ?? 10) : Math.max(props.rows.length, 1),
)
const skeletonRows = computed(() =>
  resolvedItemsPerPage.value > 0 ? Math.min(resolvedItemsPerPage.value, 12) : 6,
)

function onOptions(o: DataTableOptions): void {
  if (!server.value) return // static tables don't page/sort server-side
  emit('update:options', { page: o.page, itemsPerPage: o.itemsPerPage, sortBy: o.sortBy ?? [] })
}

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
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
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

/* footer (server mode) — toned to the hf look */
.app-data-table :deep(.v-data-table-footer) {
  background: var(--hf-surface-alt);
  border-top: 1px solid var(--hf-border);
  font-size: 12.5px;
  color: var(--hf-text-muted);
  padding: 6px 12px;
}

.app-dt-action { height: 28px; padding: 0 8px; font-size: 12px; }
.app-dt-empty {
  padding: 40px;
  text-align: center;
  color: var(--hf-text-muted);
  font-size: 13px;
}
</style>
