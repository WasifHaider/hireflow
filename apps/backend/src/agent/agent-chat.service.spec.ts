import { NotFoundException } from '@nestjs/common';
import { AgentChatService } from './agent-chat.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Every chat CRUD op is scoped by companyId AND userId together (findFirst,
 * never findUnique on id alone) — proves cross-tenant AND same-tenant
 * cross-recruiter access both 404 instead of leaking existence.
 */
describe('AgentChatService — tenant + owner isolation', () => {
  let prisma: {
    agentChat: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: AgentChatService;

  const COMPANY_A = 'company-a';
  const USER_A = 'user-a';

  beforeEach(() => {
    prisma = {
      agentChat: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AgentChatService(prisma as unknown as PrismaService);
  });

  it('list scopes findMany by both companyId and userId', async () => {
    prisma.agentChat.findMany.mockResolvedValue([]);
    await service.list(COMPANY_A, USER_A);
    expect(prisma.agentChat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: COMPANY_A, userId: USER_A } }),
    );
  });

  it('create scopes the new row to the caller company + user', async () => {
    prisma.agentChat.create.mockResolvedValue({
      id: 'chat-1', companyId: COMPANY_A, userId: USER_A, title: 'New chat',
      messages: [], createdAt: new Date(), updatedAt: new Date(),
    });
    await service.create(COMPANY_A, USER_A);
    expect(prisma.agentChat.create).toHaveBeenCalledWith({
      data: { companyId: COMPANY_A, userId: USER_A, title: 'New chat', messages: [] },
    });
  });

  it('findOne 404s when the chat belongs to a different company', async () => {
    prisma.agentChat.findFirst.mockResolvedValue(null);
    await expect(service.findOne('chat-1', 'other-company', USER_A)).rejects.toThrow(NotFoundException);
    expect(prisma.agentChat.findFirst).toHaveBeenCalledWith({
      where: { id: 'chat-1', companyId: 'other-company', userId: USER_A },
    });
  });

  it('findOne 404s when the chat belongs to a different recruiter at the SAME company', async () => {
    prisma.agentChat.findFirst.mockResolvedValue(null);
    await expect(service.findOne('chat-1', COMPANY_A, 'other-user')).rejects.toThrow(NotFoundException);
  });

  it('remove 404s instead of deleting when ownership check fails', async () => {
    prisma.agentChat.findFirst.mockResolvedValue(null);
    await expect(service.remove('chat-1', COMPANY_A, 'other-user')).rejects.toThrow(NotFoundException);
    expect(prisma.agentChat.delete).not.toHaveBeenCalled();
  });

  it('remove deletes only after confirming ownership', async () => {
    prisma.agentChat.findFirst.mockResolvedValue({ id: 'chat-1' });
    await service.remove('chat-1', COMPANY_A, USER_A);
    expect(prisma.agentChat.delete).toHaveBeenCalledWith({ where: { id: 'chat-1' } });
  });

  it('saveMessages 404s instead of writing when ownership check fails', async () => {
    prisma.agentChat.findFirst.mockResolvedValue(null);
    await expect(
      service.saveMessages('chat-1', COMPANY_A, 'other-user', [{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.agentChat.update).not.toHaveBeenCalled();
  });

  it('saveMessages auto-titles from the first user message on a fresh chat', async () => {
    prisma.agentChat.findFirst.mockResolvedValue({ title: 'New chat' });
    await service.saveMessages(
      'chat-1',
      COMPANY_A,
      USER_A,
      [{ role: 'user', content: 'Who applied to Backend Engineer?' }],
    );
    expect(prisma.agentChat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'chat-1' },
        data: expect.objectContaining({ title: 'Who applied to Backend Engineer?' }),
      }),
    );
  });

  it('saveMessages does not overwrite an existing custom title', async () => {
    prisma.agentChat.findFirst.mockResolvedValue({ title: 'My renamed chat' });
    await service.saveMessages('chat-1', COMPANY_A, USER_A, [{ role: 'user', content: 'hi' }]);
    const call = prisma.agentChat.update.mock.calls[0][0];
    expect(call.data.title).toBeUndefined();
  });
});
