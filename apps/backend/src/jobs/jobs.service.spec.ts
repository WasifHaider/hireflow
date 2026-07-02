import { Test } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JobsService.findAll', () => {
  let service: JobsService;
  let prisma: {
    $transaction: jest.Mock;
    job: { findMany: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      job: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(JobsService);
  });

  it('flattens _count.applications to applicationCount on each row', async () => {
    prisma.job.findMany.mockResolvedValue([
      { id: 'j1', title: 'A', _count: { applications: 3 }, createdBy: { id: 'u1', fullName: 'Alice', avatarUrl: null } },
      { id: 'j2', title: 'B', _count: { applications: 0 }, createdBy: { id: 'u2', fullName: 'Bob', avatarUrl: null } },
    ]);
    prisma.job.count.mockResolvedValue(2);
    prisma.job.groupBy.mockResolvedValue([]);
    prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

    const result = await service.findAll(
      { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' } as never,
      'company-1',
    );

    expect(result.total).toBe(2);
    expect(result.data[0].applicationCount).toBe(3);
    expect(result.data[1].applicationCount).toBe(0);
    expect(result.data[0]).not.toHaveProperty('_count');
  });

  describe('findAll faceted counts + owner + filters', () => {
    it('zero-fills status counts and sums all', async () => {
      prisma.job.findMany.mockResolvedValue([]);
      prisma.job.count.mockResolvedValue(0);
      prisma.job.groupBy.mockResolvedValue([
        { status: 'PUBLISHED', _count: { _all: 3 } },
        { status: 'DRAFT', _count: { _all: 1 } },
      ] as any);
      prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const res = await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' } as any, 'company-1');

      expect(res.counts).toEqual({ all: 4, DRAFT: 1, PUBLISHED: 3, CLOSED: 0 });
    });

    it('maps createdBy onto owner and flattens', async () => {
      prisma.job.findMany.mockResolvedValue([
        { id: 'j1', title: 'X', _count: { applications: 2 }, createdBy: { id: 'u1', fullName: 'Jamie Rivera', avatarUrl: null } },
      ] as any);
      prisma.job.count.mockResolvedValue(1);
      prisma.job.groupBy.mockResolvedValue([{ status: 'PUBLISHED', _count: { _all: 1 } }] as any);
      prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const res = await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' } as any, 'company-1');

      expect(res.data[0].owner).toEqual({ id: 'u1', fullName: 'Jamie Rivera', avatarUrl: null });
      expect(res.data[0].applicationCount).toBe(2);
      expect((res.data[0] as any).createdBy).toBeUndefined();
    });

    it('passes filter dims into the where clause', async () => {
      prisma.job.findMany.mockResolvedValue([]);
      prisma.job.count.mockResolvedValue(0);
      prisma.job.groupBy.mockResolvedValue([] as any);
      prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

      await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc', department: 'Engineering', jobType: 'REMOTE', ownerId: 'u9' } as any, 'company-1');

      const whereArg = prisma.job.findMany.mock.calls[0][0].where;
      expect(whereArg).toMatchObject({ companyId: 'company-1', deletedAt: null, department: 'Engineering', jobType: 'REMOTE', createdById: 'u9' });
    });

    it('counts exclude the active status tab (faceted)', async () => {
      prisma.job.findMany.mockResolvedValue([]);
      prisma.job.count.mockResolvedValue(0);
      prisma.job.groupBy.mockResolvedValue([] as any);
      prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));

      await service.findAll({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc', status: 'PUBLISHED' } as any, 'company-1');

      const groupByWhere = prisma.job.groupBy.mock.calls[0][0].where;
      expect(groupByWhere.status).toBeUndefined();
      const findWhere = prisma.job.findMany.mock.calls[0][0].where;
      expect(findWhere.status).toBe('PUBLISHED');
    });
  });
});

describe('getFacets', () => {
  let service: JobsService;
  let prisma: {
    $transaction: jest.Mock;
    job: { findMany: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      job: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(JobsService);
  });

  it('returns distinct sorted departments/locations and distinct owners', async () => {
    prisma.job.findMany.mockResolvedValue([
      { department: 'Engineering', location: 'Austin, TX', createdBy: { id: 'u1', fullName: 'Jamie', avatarUrl: null } },
      { department: 'Design', location: 'Austin, TX', createdBy: { id: 'u2', fullName: 'Maya', avatarUrl: null } },
      { department: 'Engineering', location: 'Remote', createdBy: { id: 'u1', fullName: 'Jamie', avatarUrl: null } },
      { department: null, location: 'Remote', createdBy: { id: 'u1', fullName: 'Jamie', avatarUrl: null } },
    ] as any);

    const res = await service.getFacets('company-1');

    expect(res.departments).toEqual(['Design', 'Engineering']);
    expect(res.locations).toEqual(['Austin, TX', 'Remote']);
    expect(res.owners).toEqual([
      { id: 'u1', fullName: 'Jamie', avatarUrl: null },
      { id: 'u2', fullName: 'Maya', avatarUrl: null },
    ]);
    expect(prisma.job.findMany.mock.calls[0][0].where).toMatchObject({ companyId: 'company-1', deletedAt: null });
  });
});
