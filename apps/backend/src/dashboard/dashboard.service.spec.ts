import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService.getSummary', () => {
  let service: DashboardService;
  let prisma: {
    job: { count: jest.Mock };
    application: { count: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      job: { count: jest.fn() },
      application: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('builds stats, zero-filled pipeline, and 7-day timeseries', async () => {
    prisma.job.count.mockResolvedValue(12);
    prisma.application.count.mockResolvedValueOnce(284).mockResolvedValueOnce(31);
    prisma.application.aggregate.mockResolvedValue({ _avg: { aiFitScore: 77.6 } });
    prisma.application.groupBy.mockResolvedValue([
      { currentStage: 'APPLIED', _count: 142 },
      { currentStage: 'INTERVIEW', _count: 24 },
    ]);
    prisma.$queryRaw.mockResolvedValue([{ date: '2026-06-18', count: 22 }]);

    const result = await service.getSummary('company-1');

    expect(result.stats).toEqual({ activeJobs: 12, totalApplications: 284, avgAiScore: 78, awaitingReview: 31 });
    expect(result.pipeline).toEqual({ APPLIED: 142, SCREENED: 0, INTERVIEW: 24, OFFER: 0, HIRED: 0, REJECTED: 0 });
    expect(result.applicationsPerDay).toHaveLength(7);
    const filled = result.applicationsPerDay.find((d) => d.date === '2026-06-18');
    expect(filled?.count).toBe(22);
    const empty = result.applicationsPerDay.find((d) => d.date !== '2026-06-18');
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
