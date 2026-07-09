import { Test } from '@nestjs/testing';
import { JobStatus } from '@prisma/client';
import { ApplicationSubmissionService } from '../applications/application-submission.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListPublicJobsQueryDto } from './dto/list-public-jobs-query.dto';
import { PublicService } from './public.service';

describe('PublicService.listPublicJobs', () => {
  let service: PublicService;
  let prisma: {
    job: { findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      job: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: ApplicationSubmissionService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(PublicService);
  });

  it('only returns PUBLISHED, non-deleted jobs and paginates', async () => {
    prisma.job.findMany.mockResolvedValue([{ id: 'j1' }]);
    prisma.job.count.mockResolvedValue(25);

    const query = Object.assign(new ListPublicJobsQueryDto(), {
      page: 2,
      pageSize: 12,
    });
    const result = await service.listPublicJobs(query);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: JobStatus.PUBLISHED, deletedAt: null },
        orderBy: { publishedAt: 'desc' },
        skip: 12,
        take: 12,
      }),
    );
    expect(result).toMatchObject({
      total: 25,
      page: 2,
      pageSize: 12,
      totalPages: 3,
    });
  });

  it('adds a case-insensitive title/location OR filter when q is set', async () => {
    prisma.job.findMany.mockResolvedValue([]);
    prisma.job.count.mockResolvedValue(0);

    const query = Object.assign(new ListPublicJobsQueryDto(), {
      page: 1,
      pageSize: 12,
      q: 'engineer',
      jobType: 'REMOTE',
    });
    await service.listPublicJobs(query);

    const arg = prisma.job.findMany.mock.calls[0][0];
    expect(arg.where.OR).toEqual([
      { title: { contains: 'engineer', mode: 'insensitive' } },
      { location: { contains: 'engineer', mode: 'insensitive' } },
    ]);
    expect(arg.where.jobType).toBe('REMOTE');
  });

  it('returns totalPages 0 for an empty result set', async () => {
    prisma.job.findMany.mockResolvedValue([]);
    prisma.job.count.mockResolvedValue(0);

    const result = await service.listPublicJobs(
      Object.assign(new ListPublicJobsQueryDto(), { page: 1, pageSize: 12 }),
    );
    expect(result.totalPages).toBe(0);
  });
});
