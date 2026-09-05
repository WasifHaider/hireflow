import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessage } from './types/agent.types';

const TITLE_MAX_LENGTH = 60;

export interface AgentChatSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentChatDetail extends AgentChatSummary {
  messages: ChatMessage[];
}

/**
 * CRUD for recruiter copilot chat threads. Every query is scoped by BOTH
 * companyId (tenant isolation, same rule as the rest of the app) AND userId
 * (a chat is one recruiter's own conversation — not shared across recruiters
 * at the same company). findFirst (never findUnique on id alone) so a
 * cross-tenant or cross-user id guess 404s instead of leaking existence.
 */
@Injectable()
export class AgentChatService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, userId: string): Promise<AgentChatSummary[]> {
    return this.prisma.agentChat.findMany({
      where: { companyId, userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async create(companyId: string, userId: string): Promise<AgentChatDetail> {
    const chat = await this.prisma.agentChat.create({
      data: { companyId, userId, title: 'New chat', messages: [] },
    });
    return { ...chat, messages: (chat.messages as unknown as ChatMessage[]) ?? [] };
  }

  async findOne(id: string, companyId: string, userId: string): Promise<AgentChatDetail> {
    const chat = await this.prisma.agentChat.findFirst({ where: { id, companyId, userId } });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return { ...chat, messages: (chat.messages as unknown as ChatMessage[]) ?? [] };
  }

  async rename(id: string, companyId: string, userId: string, title: string): Promise<AgentChatSummary> {
    await this.assertOwned(id, companyId, userId);
    return this.prisma.agentChat.update({
      where: { id },
      data: { title },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async remove(id: string, companyId: string, userId: string): Promise<void> {
    await this.assertOwned(id, companyId, userId);
    await this.prisma.agentChat.delete({ where: { id } });
  }

  /**
   * Persists the transcript after each agent-loop step (called from
   * AgentService, not directly by a controller). Auto-titles the chat from
   * the first user message the first time it's saved with a non-empty
   * history, so the thread list shows something useful without a separate
   * "generate a title" LLM call.
   */
  async saveMessages(id: string, companyId: string, userId: string, messages: ChatMessage[]): Promise<void> {
    const existing = await this.prisma.agentChat.findFirst({
      where: { id, companyId, userId },
      select: { title: true },
    });
    if (!existing) {
      throw new NotFoundException('Chat not found');
    }

    const data: { messages: ChatMessage[]; title?: string } = { messages };
    if (existing.title === 'New chat') {
      const firstUserMessage = messages.find((m) => m.role === 'user' && m.content);
      if (firstUserMessage?.content) {
        data.title = firstUserMessage.content.slice(0, TITLE_MAX_LENGTH);
      }
    }

    await this.prisma.agentChat.update({
      where: { id },
      data: {
        messages: data.messages as unknown as Prisma.InputJsonValue,
        ...(data.title ? { title: data.title } : {}),
      },
    });
  }

  private async assertOwned(id: string, companyId: string, userId: string): Promise<void> {
    const chat = await this.prisma.agentChat.findFirst({ where: { id, companyId, userId }, select: { id: true } });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
  }
}
