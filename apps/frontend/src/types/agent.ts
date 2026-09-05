// Mirrors apps/backend/src/agent/types/agent.types.ts (kept in sync by hand —
// no shared package in this monorepo).

export type AgentToolName =
  | 'search_candidates'
  | 'get_pipeline'
  | 'get_candidate'
  | 'move_stage'
  | 'draft_outreach'

export interface AgentChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: unknown[]
  tool_call_id?: string
  name?: string
}

export type AgentEvent =
  | { type: 'tool_call'; id: string; name: AgentToolName; args: Record<string, unknown>; label: string }
  | { type: 'tool_result'; id: string; name: AgentToolName; summary: string; data: unknown }
  | { type: 'tool_error'; id: string; name: string; message: string }
  | { type: 'confirmation_required'; id: string; name: AgentToolName; args: Record<string, unknown>; label: string }
  | { type: 'state'; messages: AgentChatMessage[] }
  | { type: 'message'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

// One row in the visible trace — a superset built up client-side from the
// SSE events above, so the panel can render each tool call as a single
// collapsing "searching candidates… found 14" line instead of two rows.
export interface AgentTraceStep {
  id: string
  name: AgentToolName | string
  label: string
  status: 'running' | 'done' | 'error' | 'awaiting_confirmation'
  summary?: string
  message?: string
}

export interface AgentTurn {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps: AgentTraceStep[]
}

export interface AgentChatSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface AgentChatDetail extends AgentChatSummary {
  messages: AgentChatMessage[]
}
