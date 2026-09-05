import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

// One entry of the chat transcript the client replays on every request.
// Loosely typed on purpose: this is the OpenAI/Groq message shape
// (role/content/tool_calls/tool_call_id/name) round-tripped verbatim from the
// `state` SSE events the server emitted; the server never re-validates its
// own field names against a nested class (would just reject valid tool_calls
// shapes), it only trusts role/content-level structure at the point of use.
export interface AgentHistoryMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
}

export class AgentConfirmDto {
  @ApiPropertyOptional() @IsString() toolCallId!: string;
  @ApiPropertyOptional() approved!: boolean;
}

export class AgentQueryDto {
  @ApiPropertyOptional({
    description: 'Chat thread id to persist this turn into. Omit for a stateless/unsaved turn.',
  })
  @IsOptional()
  @IsString()
  chatId?: string;

  @ApiPropertyOptional({
    description: 'New user message to send. Omit when resuming via `confirm`.',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description:
      'Prior transcript turns (everything the server has emitted as `state` events so far, plus the just-sent user message). Omit/empty on the first turn of a conversation — the server always prepends its own system prompt.',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  history?: AgentHistoryMessage[];

  @ApiPropertyOptional({
    description:
      'Resolution for a pending confirmation_required event (from a prior response). approved=false declines the write action.',
  })
  @IsOptional()
  @IsObject()
  confirm?: { toolCallId: string; approved: boolean };
}
