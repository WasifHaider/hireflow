import { Test } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService.getSummary', () => {
  let service: AnalyticsService;
  let prisma: {
    application: { count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
    job: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      application: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
      job: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AnalyticsService);
  });

  it('zero-fills the funnel across all 6 stages', async () => {
    prisma.application.count.mockResolvedValueOnce(100).mockResolvedValueOnce(5);
    prisma.application.groupBy.mockResolvedValue([
      { currentStage: 'APPLIED', _count: 60 },
      { currentStage: 'HIRED', _count: 5 },
    ]);
    prisma.application.findMany.mockResolvedValue([]);
    prisma.job.findMany.mockResolvedValue([]);

    const result = await service.getSummary('company-1');

    expect(result.funnel).toEqual([
      { stage: 'APPLIED', count: 60 },
      { stage: 'SCREENED', count: 0 },
      { stage: 'INTERVIEW', count: 0 },
      { stage: 'OFFER', count: 0 },
      { stage: 'HIRED', count: 5 },
      { stage: 'REJECTED', count: 0 },
    ]);
    expect(result.totalApplications).toBe(100);
    expect(result.hired).toBe(5);
  });

  it('buckets AI scores into 10 zero-filled histogram bins', async () => {
    prisma.application.count.mockResolvedValue(0);
    prisma.application.groupBy.mockResolvedValue([]);
    prisma.application.findMany.mockResolvedValue([
      { aiFitScore: 5 },
      { aiFitScore: 85 },
      { aiFitScore: 100 },
      { aiFitScore: 92 },
    ]);
    prisma.job.findMany.mockResolvedValue([]);

    const result = await service.getSummary('company-1');

    expect(result.scoreHistogram).toHaveLength(10);
    expect(result.scoreHistogram[0]).toEqual({ range: '0-9', count: 1 });
    expect(result.scoreHistogram[8]).toEqual({ range: '80-89', count: 1 });
    // 100 and 92 both land in the last (inclusive) bucket.
    expect(result.scoreHistogram[9]).toEqual({ range: '90-100', count: 2 });
    const total = result.scoreHistogram.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(4);
  });

  it('computes per-job avgScore/hires and sorts by application count, limited to 5', async () => {
    prisma.application.count.mockResolvedValue(0);
    prisma.application.groupBy.mockResolvedValue([]);
    prisma.application.findMany.mockResolvedValue([]);
    prisma.job.findMany.mockResolvedValue([
      {
        id: 'j1',
        title: 'Low volume',
        department: 'Sales',
        _count: { applications: 2 },
        applications: [
          { aiFitScore: 80, currentStage: 'HIRED' },
          { aiFitScore: 60, currentStage: 'APPLIED' },
        ],
      },
      {
        id: 'j2',
        title: 'High volume',
        department: 'Engineering',
        _count: { applications: 10 },
        applications: [{ aiFitScore: null, currentStage: 'APPLIED' }],
      },
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `filler-${i}`,
        title: `Filler ${i}`,
        department: null,
        _count: { applications: 1 },
        applications: [],
      })),
    ]);

    const result = await service.getSummary('company-1');

    expect(result.topJobs).toHaveLength(5);
    expect(result.topJobs[0]).toEqual({
      id: 'j2',
      title: 'High volume',
      department: 'Engineering',
      applicationCount: 10,
      avgScore: 0,
      hires: 0,
    });
    expect(result.topJobs[1]).toEqual({
      id: 'j1',
      title: 'Low volume',
      department: 'Sales',
      applicationCount: 2,
      avgScore: 70,
      hires: 1,
    });
  });
});
