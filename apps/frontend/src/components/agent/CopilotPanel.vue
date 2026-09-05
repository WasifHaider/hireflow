<template>
  <!-- Slide-over panel: fixed to the right edge, toggled by a button in the
       app bar. Kept as its own component so RecruiterLayout stays thin. -->
  <Transition name="hf-panel-slide">
    <aside v-if="agentStore.panelOpen" class="hf-agent-panel">
      <header class="hf-agent-header">
        <v-btn
          v-if="!showThreads"
          class="hf-icon-btn"
          variant="text"
          :ripple="false"
          title="Chat history"
          @click="showThreads = true"
        >
          <HfIcon name="menu" :size="16" />
        </v-btn>
        <div class="hf-agent-title">
          <HfIcon name="sparkles" :size="16" />
          Copilot
        </div>
        <div class="hf-agent-header-actions">
          <v-btn class="hf-icon-btn" variant="text" :ripple="false" title="New chat" @click="startNewChat">
            <HfIcon name="plus" :size="16" />
          </v-btn>
          <v-btn class="hf-icon-btn" variant="text" :ripple="false" @click="agentStore.togglePanel()">
            <HfIcon name="x" :size="16" />
          </v-btn>
        </div>
      </header>

      <!-- ── Thread list ─────────────────────────────────────────────────── -->
      <div v-if="showThreads" class="hf-agent-threads">
        <div v-if="agentStore.chats.length === 0" class="hf-agent-empty">
          No chats yet. Start one with the + button above.
        </div>
        <ul v-else class="hf-agent-thread-list">
          <li
            v-for="chat in agentStore.chats"
            :key="chat.id"
            class="hf-agent-thread-row"
            :class="{ 'hf-agent-thread-row--active': chat.id === agentStore.activeChatId }"
            @click="openChat(chat.id)"
          >
            <span class="hf-agent-thread-title">{{ chat.title }}</span>
            <v-btn
              class="hf-icon-btn hf-agent-thread-delete"
              variant="text"
              :ripple="false"
              title="Delete chat"
              @click.stop="confirmDelete(chat.id)"
            >
              <HfIcon name="x" :size="14" />
            </v-btn>
          </li>
        </ul>
      </div>

      <!-- ── Active chat ─────────────────────────────────────────────────── -->
      <template v-else>
        <div ref="scrollEl" class="hf-agent-body">
          <div v-if="agentStore.loadingChat" class="hf-agent-empty">Loading…</div>
          <div v-else-if="agentStore.turns.length === 0" class="hf-agent-empty">
            Ask about candidates, pipeline stages, or draft outreach — e.g.
            <em>"Who applied to Backend Engineer with a fit score over 80?"</em>
          </div>

          <div v-for="turn in agentStore.turns" :key="turn.id" class="hf-agent-turn" :class="`hf-agent-turn--${turn.role}`">
            <template v-if="turn.role === 'user'">
              <div class="hf-agent-bubble hf-agent-bubble--user">{{ turn.content }}</div>
            </template>

            <template v-else>
              <!-- Visible trace: this is what makes it read as agentic rather
                   than a bare LLM textbox. -->
              <ul v-if="turn.steps.length" class="hf-agent-trace">
                <li v-for="step in turn.steps" :key="step.id" class="hf-agent-trace-step" :class="`hf-agent-trace-step--${step.status}`">
                  <span class="hf-agent-trace-dot" />
                  <span class="hf-agent-trace-text">
                    <template v-if="step.status === 'running'">{{ step.label }}</template>
                    <template v-else-if="step.status === 'done'">{{ step.summary }}</template>
                    <template v-else-if="step.status === 'error'">{{ step.label }} failed — {{ step.message }}</template>
                    <template v-else-if="step.status === 'awaiting_confirmation'">{{ step.label }} — waiting for your confirmation</template>
                  </span>
                </li>
              </ul>

              <div
                v-if="turn.content"
                class="hf-agent-bubble hf-agent-bubble--assistant"
                v-html="formatMarkdownLite(turn.content)"
              />

              <!-- Confirm/decline bar for a pending write action, shown only on
                   the turn currently awaiting confirmation. -->
              <div v-if="isPendingTurn(turn)" class="hf-agent-confirm">
                <span>Confirm this action?</span>
                <div class="hf-agent-confirm-actions">
                  <AppButton variant="ghost" :disabled="agentStore.busy" @click="agentStore.confirm(false)">Decline</AppButton>
                  <AppButton variant="primary" :disabled="agentStore.busy" @click="agentStore.confirm(true)">Confirm</AppButton>
                </div>
              </div>
            </template>
          </div>

          <div v-if="agentStore.busy && !agentStore.pendingConfirmation" class="hf-agent-thinking">
            <span class="hf-agent-trace-dot hf-agent-trace-dot--pulse" />
            thinking…
          </div>
        </div>

        <form class="hf-agent-composer" @submit.prevent="send">
          <input
            v-model="draft"
            class="hf-agent-input"
            type="text"
            placeholder="Ask the copilot…"
            :disabled="agentStore.busy || !!agentStore.pendingConfirmation"
          />
          <v-btn
            class="hf-icon-btn"
            variant="text"
            :ripple="false"
            type="submit"
            :disabled="agentStore.busy || !!agentStore.pendingConfirmation || !draft.trim()"
          >
            <HfIcon name="arrowRight" :size="16" />
          </v-btn>
        </form>
      </template>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useAgentStore } from '@/stores/agent.store'
import type { AgentTurn } from '@/types/agent'
import HfIcon from '@/components/common/HfIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const agentStore = useAgentStore()
const draft = ref('')
const scrollEl = ref<HTMLElement | null>(null)
// Panel starts on the thread list only when there's no active chat yet;
// otherwise reopen straight into the last-viewed conversation.
const showThreads = ref(false)

// Minimal, dependency-free markdown renderer for the model's plain-text
// replies (bold, bullet lists, line breaks only — nothing richer than that
// shows up in practice). HTML-escapes the raw content FIRST so nothing the
// model writes (or any candidate/job data it echoes back) can inject markup;
// only our own <strong>/<ul>/<li>/<br> tags are ever introduced afterward.
function formatMarkdownLite(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const html: string[] = []
  let inList = false

  for (const line of lines) {
    const bulletMatch = /^[-*]\s+(.*)/.exec(line)
    if (bulletMatch) {
      if (!inList) {
        html.push('<ul class="hf-agent-md-list">')
        inList = true
      }
      html.push(`<li>${inlineMarkdown(bulletMatch[1] ?? '')}</li>`)
      continue
    }
    if (inList) {
      html.push('</ul>')
      inList = false
    }
    if (line.trim() === '') {
      html.push('<br>')
    } else {
      html.push(`<div>${inlineMarkdown(line)}</div>`)
    }
  }
  if (inList) html.push('</ul>')

  return html.join('')
}

function inlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function isPendingTurn(turn: AgentTurn): boolean {
  if (!agentStore.pendingConfirmation) return false
  return turn.steps.some((s) => s.id === agentStore.pendingConfirmation!.id)
}

async function send() {
  const message = draft.value
  draft.value = ''
  await agentStore.ask(message)
}

async function openChat(id: string) {
  showThreads.value = false
  await agentStore.selectChat(id)
}

async function startNewChat() {
  await agentStore.newChat()
  showThreads.value = false
}

async function confirmDelete(id: string) {
  await agentStore.deleteChat(id)
}

// Opening the panel with no active chat lands on the thread list; a chat
// already in progress keeps the conversation in view.
watch(
  () => agentStore.panelOpen,
  (open) => {
    if (open) showThreads.value = !agentStore.activeChatId
  },
)

// Autoscroll to the latest trace step/message as events stream in.
watch(
  () => JSON.stringify(agentStore.turns),
  async () => {
    await nextTick()
    scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: 'smooth' })
  },
)
</script>

<style scoped>
.hf-agent-panel {
  position: fixed;
  top: 56px; /* below the app bar */
  right: 0;
  bottom: 0;
  width: 360px;
  background: white;
  border-left: 1px solid var(--hf-border);
  display: flex;
  flex-direction: column;
  z-index: 20;
  box-shadow: -8px 0 24px rgba(15, 23, 42, 0.06);
}
.hf-panel-slide-enter-active,
.hf-panel-slide-leave-active {
  transition: transform 0.2s ease;
}
.hf-panel-slide-enter-from,
.hf-panel-slide-leave-to {
  transform: translateX(100%);
}

.hf-agent-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--hf-border);
}
.hf-agent-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--hf-text);
  flex: 1;
}
.hf-agent-header-actions {
  display: flex;
  gap: 2px;
}
.hf-icon-btn.v-btn {
  width: 30px;
  height: 30px;
  min-width: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--hf-text-muted);
}
.hf-icon-btn.v-btn:hover {
  background: var(--hf-bg);
}

.hf-agent-threads {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.hf-agent-thread-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hf-agent-thread-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--hf-text);
}
.hf-agent-thread-row:hover {
  background: var(--hf-bg);
}
.hf-agent-thread-row--active {
  background: #eef2ff;
  color: var(--hf-primary, #4f46e5);
  font-weight: 500;
}
.hf-agent-thread-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hf-agent-thread-delete.v-btn {
  width: 22px;
  height: 22px;
  opacity: 0;
}
.hf-agent-thread-row:hover .hf-agent-thread-delete.v-btn {
  opacity: 1;
}

.hf-agent-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hf-agent-empty {
  font-size: 13px;
  color: var(--hf-text-subtle);
  line-height: 1.5;
  padding: 4px;
}

.hf-agent-turn {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hf-agent-turn--user {
  align-items: flex-end;
}

.hf-agent-bubble {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  line-height: 1.45;
}
.hf-agent-bubble--assistant :deep(ul.hf-agent-md-list) {
  margin: 2px 0;
  padding-left: 18px;
}
.hf-agent-bubble--assistant :deep(li) {
  margin: 2px 0;
}
.hf-agent-bubble--assistant :deep(strong) {
  font-weight: 600;
}
.hf-agent-bubble--user {
  background: var(--hf-primary, #4f46e5);
  color: white;
  white-space: pre-wrap;
}
.hf-agent-bubble--assistant {
  background: var(--hf-bg);
  color: var(--hf-text);
  align-self: flex-start;
}

.hf-agent-trace {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.hf-agent-trace-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  color: var(--hf-text-muted);
}
.hf-agent-trace-dot {
  margin-top: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--hf-text-subtle);
  flex-shrink: 0;
}
.hf-agent-trace-step--done .hf-agent-trace-dot {
  background: var(--hf-accent, #10b981);
}
.hf-agent-trace-step--error .hf-agent-trace-dot {
  background: var(--hf-danger, #ef4444);
}
.hf-agent-trace-step--awaiting_confirmation .hf-agent-trace-dot {
  background: #f59e0b;
}
.hf-agent-trace-step--running .hf-agent-trace-dot,
.hf-agent-trace-dot--pulse {
  animation: hf-pulse 1.1s ease-in-out infinite;
}
@keyframes hf-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.hf-agent-trace-step--error .hf-agent-trace-text {
  color: var(--hf-danger, #ef4444);
}

.hf-agent-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--hf-text-subtle);
}

.hf-agent-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--hf-border);
  border-radius: 8px;
  background: #fffbeb;
  font-size: 12.5px;
  color: var(--hf-text);
}
.hf-agent-confirm-actions {
  display: flex;
  gap: 6px;
}
.hf-agent-confirm-actions :deep(.v-btn) {
  height: 28px !important;
  font-size: 12px !important;
  padding: 0 10px !important;
}

.hf-agent-composer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border-top: 1px solid var(--hf-border);
}
.hf-agent-input {
  flex: 1;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--hf-border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--hf-text);
  background: var(--hf-bg);
}
.hf-agent-input:focus {
  outline: none;
  border-color: var(--hf-primary, #4f46e5);
}
.hf-agent-input:disabled {
  opacity: 0.6;
}
</style>
