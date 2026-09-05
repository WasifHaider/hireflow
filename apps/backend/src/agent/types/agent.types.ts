// Wire types for the recruiter copilot agent loop. These mirror the
// OpenAI-compatible chat-completions shape Groq exposes (messages + tools +
// tool_calls) — kept separate from ApplicationsService DTOs because this is
// a transport concern, not a domain one.

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCallFunction {
  name: string;
  arguments: string; // JSON-encoded string, per OpenAI tool-calling spec
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: ToolCallFunction;
}

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// Tool names the model is allowed to call. Kept as a union so
// AgentToolsService and the tool-schema constant can't drift apart silently.
export type AgentToolName =
  | 'search_candidates'
  | 'get_pipeline'
  | 'get_candidate'
  | 'move_stage'
  | 'draft_outreach';

// Tools whose execution mutates data — the agent loop must pause and surface
// a confirmation_required event instead of executing these immediately.
export const WRITE_TOOLS: ReadonlySet<AgentToolName> = new Set(['move_stage']);

// ── SSE event contract consumed by the Vue side panel ──────────────────────
export type AgentEvent =
  | { type: 'tool_call'; id: string; name: AgentToolName; args: Record<string, unknown>; label: string }
  | { type: 'tool_result'; id: string; name: AgentToolName; summary: string; data: unknown }
  | { type: 'tool_error'; id: string; name: string; message: string }
  | {
      type: 'confirmation_required';
      id: string;
      name: AgentToolName;
      args: Record<string, unknown>;
      label: string;
    }
  // Incremental transcript entries the client must append verbatim to the
  // `history` it replays on the next request (system prompt excluded — the
  // server always re-derives that itself).
  | { type: 'state'; messages: ChatMessage[] }
  | { type: 'message'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
