import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

describe('DashboardService.getSummary', () => {
  let service: DashboardService;
  let prisma: {
    job: { count: jest.Mock };
    application: { count: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let aiService: { generateDashboardSuggestions: jest.Mock };

  beforeEach(async () => {
    prisma = {
      job: { count: jest.fn() },
      application: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
      $queryRaw: jest.fn(),
    };
    aiService = { generateDashboardSuggestions: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('builds stats, zero-filled pipeline, and 7-day timeseries', async () => {
    // Use "today" (UTC) rather than a hardcoded date so this test doesn't go
    // stale as real time passes — getSummary's `since` boundary is always a
    // rolling 7-day UTC window ending today.
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const todayKey = todayUtc.toISOString().slice(0, 10);

    prisma.job.count.mockResolvedValue(12);
    prisma.application.count.mockResolvedValueOnce(284).mockResolvedValueOnce(31);
    prisma.application.aggregate.mockResolvedValue({ _avg: { aiFitScore: 77.6 } });
    prisma.application.groupBy.mockResolvedValue([
      { currentStage: 'APPLIED', _count: 142 },
      { currentStage: 'INTERVIEW', _count: 24 },
    ]);
    prisma.$queryRaw.mockResolvedValue([{ date: todayKey, count: 22 }]);

    const result = await service.getSummary('company-1');

    expect(result.stats).toEqual({ activeJobs: 12, totalApplications: 284, avgAiScore: 78, awaitingReview: 31 });
    expect(result.pipeline).toEqual({ APPLIED: 142, SCREENED: 0, INTERVIEW: 24, OFFER: 0, HIRED: 0, REJECTED: 0 });
    expect(result.applicationsPerDay).toHaveLength(7);
    const filled = result.applicationsPerDay.find((d) => d.date === todayKey);
    expect(filled?.count).toBe(22);
    const empty = result.applicationsPerDay.find((d) => d.date !== todayKey);
    expect(empty?.count).toBe(0);
  });

  it('returns avgAiScore 0 when no scored applications', async () => {
    prisma.job.count.mockResolvedValue(0);
    prisma.application.count.mockResolvedValue(0);
    prisma.application.aggregate.mockResolvedValue({ _avg: { aiFitScore: null } });
    prisma.application.groupBy.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getSummary('company-1');
    expect(result.stats.avgAiScore).toBe(0);
    expect(result.pipeline.APPLIED).toBe(0);
    expect(result.applicationsPerDay.every((d) => d.count === 0)).toBe(true);
  });
});

describe('DashboardService.getSuggestions', () => {
  let service: DashboardService;
  let prisma: {
    job: { count: jest.Mock };
    application: { count: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let aiService: { generateDashboardSuggestions: jest.Mock };

  beforeEach(async () => {
    prisma = {
      job: { count: jest.fn().mockResolvedValue(1) },
      application: {
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn().mockResolvedValue({ _avg: { aiFitScore: 50 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    aiService = { generateDashboardSuggestions: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('returns the AI-generated suggestions on success', async () => {
    aiService.generateDashboardSuggestions.mockResolvedValue(['Do X', 'Do Y']);

    const result = await service.getSuggestions('company-1');

    expect(result).toEqual(['Do X', 'Do Y']);
    expect(aiService.generateDashboardSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({ activeJobs: 1, totalApplications: 1 }),
    );
  });

  it('swallows AI failures and returns an empty array (non-critical card)', async () => {
    aiService.generateDashboardSuggestions.mockRejectedValue(new Error('Groq down'));

    const result = await service.getSuggestions('company-1');

    expect(result).toEqual([]);
  });
});
