import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  AGENT_MAX_ITERATIONS,
  AGENT_SYSTEM_PROMPT,
  AGENT_TOOL_SCHEMAS,
  TOOL_CALL_LABELS,
} from './agent.constants';
import { AgentChatService } from './agent-chat.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AgentEvent, AgentToolName, ChatMessage, ToolCall, WRITE_TOOLS } from './types/agent.types';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CHAT_MODEL = 'openai/gpt-oss-120b';

interface GroqChatResponse {
  choices?: { message?: ChatMessage }[];
}

/**
 * Runs the recruiter copilot's agent loop for one HTTP request: call the
 * model with the fixed tool schema -> execute any tool calls against
 * ApplicationsService/AiService -> feed results back -> repeat until the
 * model answers in plain text, a write tool needs confirmation, or the
 * iteration cap is hit. Emits one AgentEvent per step via `onEvent`; the
 * caller (AgentController) turns those into SSE frames.
 *
 * TENANT ISOLATION: `companyId` comes from the caller (the controller reads
 * it off the JWT-derived CurrentUser, never off the request body) and is
 * threaded straight into every AgentToolsService.execute() call below. The
 * model's tool-call arguments are parsed from free-form JSON it wrote itself
 * and are NEVER a source of companyId — there is no code path where a
 * companyId in `args` could reach a query. That's the entire tenant-safety
 * story for this endpoint and it's why it's covered by a targeted unit test
 * rather than left to code review.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly tools: AgentToolsService,
    private readonly chats: AgentChatService,
    config: ConfigService,
  ) {
    this.apiKey = config.getOrThrow<string>('GROQ_API_KEY');
  }

  async run(
    dto: AgentQueryDto,
    companyId: string,
    userId: string,
    onEvent: (event: AgentEvent) => void,
  ): Promise<void> {
    // Wrap the caller's onEvent so every `state` snapshot is persisted to the
    // chat thread (if one was given) the instant it's emitted — the SSE
    // stream and the DB write always see the same transcript.
    const emit = (event: AgentEvent) => {
      onEvent(event);
      if (dto.chatId && event.type === 'state') {
        this.chats.saveMessages(dto.chatId, companyId, userId, event.messages).catch((err) => {
          this.logger.error(`Failed to persist chat ${dto.chatId}: ${(err as Error).message}`);
        });
      }
    };

    let messages = this.buildInitialMessages(dto);

    // Resuming after a confirmation_required pause: the pending tool call is
    // the last assistant message's tool_calls entry matching confirm.toolCallId.
    if (dto.confirm) {
      const resumed = await this.resolveConfirmation(messages, dto.confirm, companyId, emit);
      if (resumed === null) return; // error already emitted
      messages = resumed;
    }

    for (let iteration = 0; iteration < AGENT_MAX_ITERATIONS; iteration++) {
      let assistantMessage: ChatMessage;
      try {
        assistantMessage = await this.callModel(messages);
      } catch (err) {
        this.logger.error(`Groq chat completion failed: ${(err as Error).message}`);
        emit({ type: 'error', message: 'The AI service is unavailable right now.' });
        return;
      }

      messages = [...messages, assistantMessage];

      const toolCalls = assistantMessage.tool_calls ?? [];
      if (toolCalls.length === 0) {
        emit({ type: 'message', content: assistantMessage.content ?? '' });
        emit({ type: 'state', messages: this.stripSystemPrompt(messages) });
        emit({ type: 'done' });
        return;
      }

      // parallel_tool_calls:false on the request keeps this to one, but stay
      // defensive — only the first is honored either way.
      const call = toolCalls[0] as ToolCall;
      const name = call.function.name as AgentToolName;
      const args = this.parseArgs(call.function.arguments);

      emit({
        type: 'tool_call',
        id: call.id,
        name,
        args,
        label: TOOL_CALL_LABELS[name] ?? `Calling ${name}…`,
      });

      if (WRITE_TOOLS.has(name)) {
        emit({ type: 'state', messages: this.stripSystemPrompt(messages) });
        emit({
          type: 'confirmation_required',
          id: call.id,
          name,
          args,
          label: TOOL_CALL_LABELS[name] ?? `Calling ${name}…`,
        });
        return; // pause here — client must re-POST with `confirm`
      }

      try {
        const result = await this.tools.execute(name, args, companyId);
        emit({ type: 'tool_result', id: call.id, name, summary: result.summary, data: result.data });
        messages = [...messages, this.toolResultMessage(call.id, name, result.summary, result.data)];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tool execution failed';
        emit({ type: 'tool_error', id: call.id, name, message });
        messages = [...messages, this.toolErrorMessage(call.id, name, message)];
      }
    }

    emit({ type: 'error', message: 'The copilot could not finish within its step budget.' });
  }

  /**
   * Resumes after a confirmation_required pause. Locates the pending call in
   * the last assistant message's tool_calls, executes it (approved) or
   * records the decline (not approved), and returns the extended message
   * list ready for the next model call.
   */
  private async resolveConfirmation(
    messages: ChatMessage[],
    confirm: { toolCallId: string; approved: boolean },
    companyId: string,
    onEvent: (event: AgentEvent) => void,
  ): Promise<ChatMessage[] | null> {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const pending = lastAssistant?.tool_calls?.find((c) => c.id === confirm.toolCallId);
    if (!pending) {
      onEvent({ type: 'error', message: 'No pending confirmation matches that id.' });
      return null;
    }

    const name = pending.function.name as AgentToolName;
    const args = this.parseArgs(pending.function.arguments);

    if (!confirm.approved) {
      onEvent({ type: 'tool_result', id: pending.id, name, summary: 'declined by user', data: null });
      return [...messages, this.toolResultMessage(pending.id, name, 'The user declined this action.', null)];
    }

    try {
      const result = await this.tools.execute(name, args, companyId);
      onEvent({ type: 'tool_result', id: pending.id, name, summary: result.summary, data: result.data });
      return [...messages, this.toolResultMessage(pending.id, name, result.summary, result.data)];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed';
      onEvent({ type: 'tool_error', id: pending.id, name, message });
      return [...messages, this.toolErrorMessage(pending.id, name, message)];
    }
  }

  private buildInitialMessages(dto: AgentQueryDto): ChatMessage[] {
    const history: ChatMessage[] = (dto.history ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls as ChatMessage['tool_calls'],
      tool_call_id: m.tool_call_id,
      name: m.name,
    }));

    const messages: ChatMessage[] = [{ role: 'system', content: AGENT_SYSTEM_PROMPT }, ...history];

    if (dto.message) {
      messages.push({ role: 'user', content: dto.message });
    } else if (!dto.confirm && history.length === 0) {
      throw new BadRequestException('message is required to start a conversation');
    }

    return messages;
  }

  private async callModel(messages: ChatMessage[]): Promise<ChatMessage> {
    const { data } = await firstValueFrom(
      this.http.post<GroqChatResponse>(
        GROQ_CHAT_URL,
        {
          model: CHAT_MODEL,
          messages,
          tools: AGENT_TOOL_SCHEMAS,
          tool_choice: 'auto',
          parallel_tool_calls: false,
          temperature: 0.3,
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 30000,
        },
      ),
    ).catch((err: AxiosError) => {
      throw new Error(`${err.message} (status ${err.response?.status ?? 'n/a'})`);
    });

    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error('Groq returned no choices');
    }
    return message;
  }

  private parseArgs(raw: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(raw || '{}');
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private toolResultMessage(toolCallId: string, name: string, summary: string, data: unknown): ChatMessage {
    return {
      role: 'tool',
      tool_call_id: toolCallId,
      name,
      content: JSON.stringify({ summary, data }),
    };
  }

  private toolErrorMessage(toolCallId: string, name: string, message: string): ChatMessage {
    return {
      role: 'tool',
      tool_call_id: toolCallId,
      name,
      content: JSON.stringify({ error: message }),
    };
  }

  // The client only ever needs to replay non-system turns back to us — we
  // always re-derive the system prompt fresh (it may change between deploys).
  private stripSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter((m) => m.role !== 'system');
  }
}
