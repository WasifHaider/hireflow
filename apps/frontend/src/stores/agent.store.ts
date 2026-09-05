import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { getApiErrorMessage } from '@/plugins/axios'
import type {
  AgentChatDetail,
  AgentChatMessage,
  AgentChatSummary,
  AgentEvent,
  AgentToolName,
  AgentTraceStep,
  AgentTurn,
} from '@/types/agent'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3200'

const TOOL_LABELS: Record<string, string> = {
  search_candidates: 'Searching candidates…',
  get_pipeline: 'Reading pipeline…',
  get_candidate: 'Looking up candidate…',
  move_stage: 'Moving candidate stage…',
  draft_outreach: 'Drafting outreach…',
}

interface RawToolCall {
  id: string
  function: { name: string; arguments: string }
}

/**
 * Rebuilds the visible turn/trace list from a persisted transcript (the same
 * role/content/tool_calls/tool_call_id shape the backend streams over SSE).
 * One user message starts a new turn; the assistant turn that follows
 * accumulates tool_call trace steps until content arrives or another user
 * message starts the next turn.
 */
function turnsFromHistory(messages: AgentChatMessage[]): AgentTurn[] {
  const turns: AgentTurn[] = []
  let current: AgentTurn | null = null

  for (const m of messages) {
    if (m.role === 'user') {
      turns.push({ id: crypto.randomUUID(), role: 'user', content: m.content ?? '', steps: [] })
      current = { id: crypto.randomUUID(), role: 'assistant', content: '', steps: [] }
      turns.push(current)
      continue
    }
    if (m.role === 'assistant') {
      if (!current) {
        current = { id: crypto.randomUUID(), role: 'assistant', content: '', steps: [] }
        turns.push(current)
      }
      const toolCalls = (m.tool_calls as RawToolCall[] | undefined) ?? []
      for (const tc of toolCalls) {
        const name = tc.function.name as AgentToolName
        current.steps.push({ id: tc.id, name, label: TOOL_LABELS[name] ?? `Calling ${name}…`, status: 'running' })
      }
      if (m.content) current.content = m.content
      continue
    }
    if (m.role === 'tool' && current) {
      const step = current.steps.find((s) => s.id === m.tool_call_id)
      if (!step) continue
      try {
        const parsed = JSON.parse(m.content ?? '{}') as { summary?: string; error?: string }
        if (parsed.error) {
          step.status = 'error'
          step.message = parsed.error
        } else {
          step.status = 'done'
          step.summary = parsed.summary ?? ''
        }
      } catch {
        step.status = 'done'
      }
    }
  }

  return turns
}

/**
 * Drives the recruiter copilot side panel: the chat-thread list (persisted
 * server-side, tenant + owner scoped) plus the active thread's live SSE
 * turn-by-turn trace. The backend endpoint is a single POST that streams
 * Server-Sent Events; axios doesn't stream response bodies in the browser,
 * so `stream()` uses fetch() + a manual SSE line-reader instead. Auth/tenant
 * scoping is entirely server-side (JWT bearer token) — this store never
 * sends or receives a companyId.
 */
export const useAgentStore = defineStore('agent', () => {
  const chats = ref<AgentChatSummary[]>([])
  const chatsLoaded = ref(false)
  const activeChatId = ref<string | null>(null)

  const turns = ref<AgentTurn[]>([])
  const history = ref<AgentChatMessage[]>([])
  const pendingConfirmation = ref<{ id: string; name: string; label: string } | null>(null)
  const busy = ref(false)
  const loadingChat = ref(false)
  const panelOpen = ref(false)
  const error = ref<string | null>(null)

  function togglePanel() {
    panelOpen.value = !panelOpen.value
    if (panelOpen.value && !chatsLoaded.value) {
      void fetchChats()
    }
  }

  async function fetchChats(): Promise<void> {
    try {
      const { data } = await api.get<AgentChatSummary[]>('/agent/chats')
      chats.value = data
      chatsLoaded.value = true
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load your chats.')
    }
  }

  async function newChat(): Promise<void> {
    try {
      const { data } = await api.post<AgentChatDetail>('/agent/chats')
      chats.value.unshift({ id: data.id, title: data.title, createdAt: data.createdAt, updatedAt: data.updatedAt })
      activeChatId.value = data.id
      turns.value = []
      history.value = []
      pendingConfirmation.value = null
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to start a new chat.')
    }
  }

  async function selectChat(id: string): Promise<void> {
    if (activeChatId.value === id) return
    activeChatId.value = id
    pendingConfirmation.value = null
    loadingChat.value = true
    try {
      const { data } = await api.get<AgentChatDetail>(`/agent/chats/${id}`)
      history.value = data.messages
      turns.value = turnsFromHistory(data.messages)
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load that chat.')
      turns.value = []
      history.value = []
    } finally {
      loadingChat.value = false
    }
  }

  async function deleteChat(id: string): Promise<void> {
    try {
      await api.delete(`/agent/chats/${id}`)
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to delete that chat.')
      return
    }
    chats.value = chats.value.filter((c) => c.id !== id)
    if (activeChatId.value === id) {
      activeChatId.value = null
      turns.value = []
      history.value = []
      pendingConfirmation.value = null
    }
  }

  function findStep(turn: AgentTurn, id: string): AgentTraceStep | undefined {
    return turn.steps.find((s) => s.id === id)
  }

  async function stream(body: Record<string, unknown>, turn: AgentTurn): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${BASE_URL}/agent/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...body, chatId: activeChatId.value ?? undefined }),
    })

    if (!res.ok || !res.body) {
      turn.content = 'The copilot is unavailable right now.'
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by a blank line; each frame's payload lines
      // start with "data: ".
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        const dataLine = frame
          .split('\n')
          .find((l) => l.startsWith('data:'))
          ?.slice(5)
          .trim()
        if (!dataLine) continue
        let event: AgentEvent
        try {
          event = JSON.parse(dataLine) as AgentEvent
        } catch {
          continue
        }
        handleEvent(event, turn)
      }
    }
  }

  function handleEvent(event: AgentEvent, turn: AgentTurn) {
    switch (event.type) {
      case 'tool_call':
        turn.steps.push({ id: event.id, name: event.name, label: event.label, status: 'running' })
        break
      case 'tool_result': {
        const step = findStep(turn, event.id)
        if (step) {
          step.status = 'done'
          step.summary = event.summary
        }
        break
      }
      case 'tool_error': {
        const step = findStep(turn, event.id)
        if (step) {
          step.status = 'error'
          step.message = event.message
        }
        break
      }
      case 'confirmation_required': {
        const step = findStep(turn, event.id)
        if (step) step.status = 'awaiting_confirmation'
        pendingConfirmation.value = { id: event.id, name: event.name, label: event.label }
        break
      }
      case 'state':
        history.value = event.messages as AgentChatMessage[]
        // Bump the active chat's row so a resort-by-updatedAt (if the caller
        // wants it) reflects recency; also picks up the server's auto-title
        // on the very first turn without a second round-trip.
        if (activeChatId.value) {
          void refreshActiveChatSummary()
        }
        break
      case 'message':
        turn.content = event.content
        break
      case 'error':
        turn.content = event.message
        break
      case 'done':
        break
    }
  }

  async function refreshActiveChatSummary(): Promise<void> {
    const id = activeChatId.value
    if (!id) return
    const existing = chats.value.find((c) => c.id === id)
    // Only worth a round-trip the first time (title still the default) —
    // afterwards updatedAt drift alone isn't worth a fetch per turn.
    if (existing && existing.title !== 'New chat') return
    try {
      const { data } = await api.get<AgentChatDetail>(`/agent/chats/${id}`)
      const idx = chats.value.findIndex((c) => c.id === id)
      const summary = { id: data.id, title: data.title, createdAt: data.createdAt, updatedAt: data.updatedAt }
      if (idx === -1) chats.value.unshift(summary)
      else chats.value[idx] = summary
    } catch {
      // Non-critical: the sidebar title just stays "New chat" until next reload.
    }
  }

  async function ask(message: string): Promise<void> {
    if (!message.trim() || busy.value) return
    if (!activeChatId.value) {
      await newChat()
      if (!activeChatId.value) return // newChat failed
    }
    busy.value = true
    pendingConfirmation.value = null

    turns.value.push({ id: crypto.randomUUID(), role: 'user', content: message, steps: [] })
    const assistantTurn: AgentTurn = { id: crypto.randomUUID(), role: 'assistant', content: '', steps: [] }
    turns.value.push(assistantTurn)

    try {
      await stream({ message, history: history.value }, assistantTurn)
    } finally {
      busy.value = false
    }
  }

  async function confirm(approved: boolean): Promise<void> {
    if (!pendingConfirmation.value || busy.value) return
    const toolCallId = pendingConfirmation.value.id
    pendingConfirmation.value = null
    busy.value = true

    const assistantTurn = turns.value[turns.value.length - 1]
    try {
      await stream({ confirm: { toolCallId, approved }, history: history.value }, assistantTurn!)
    } finally {
      busy.value = false
    }
  }

  return {
    chats,
    activeChatId,
    turns,
    pendingConfirmation,
    busy,
    loadingChat,
    panelOpen,
    error,
    togglePanel,
    fetchChats,
    newChat,
    selectChat,
    deleteChat,
    ask,
    confirm,
  }
})
