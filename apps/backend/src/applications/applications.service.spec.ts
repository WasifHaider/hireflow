import { Test } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';

describe('ApplicationsService.findAll', () => {
  let service: ApplicationsService;
  let prisma: {
    application: { findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      application: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it('scopes the query to companyId and paginates', async () => {
    const rows = [
      {
        id: 'a1',
        currentStage: 'APPLIED',
        aiFitScore: 92,
        appliedAt: new Date('2026-06-18'),
        candidate: { fullName: 'Sarah Chen', email: 's@hey.com' },
        job: { id: 'j1', title: 'Backend' },
      },
    ];
    prisma.application.findMany.mockResolvedValue(rows);
    prisma.application.count.mockResolvedValue(1);

    const query = Object.assign(new ListApplicationsQueryDto(), {
      page: 1, pageSize: 20, sortBy: 'appliedAt', sortOrder: 'desc',
    });
    const result = await service.findAll(query, 'company-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1' },
        orderBy: { appliedAt: 'desc' },
        skip: 0,
        take: 20,
      }),
    );
    expect(result).toEqual({ data: rows, total: 1, page: 1, pageSize: 20, totalPages: 1 });
  });

  it('applies jobId and stage filters when present', async () => {
    prisma.application.findMany.mockResolvedValue([]);
    prisma.application.count.mockResolvedValue(0);
    const query = Object.assign(new ListApplicationsQueryDto(), {
      page: 1, pageSize: 20, sortBy: 'aiFitScore', sortOrder: 'asc', jobId: 'job-9', stage: 'INTERVIEW',
    });
    await service.findAll(query, 'company-1');
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', jobId: 'job-9', currentStage: 'INTERVIEW' },
        orderBy: { aiFitScore: 'asc' },
      }),
    );
  });

  it('filters by candidate name/email when q is present', async () => {
    prisma.application.findMany.mockResolvedValue([]);
    prisma.application.count.mockResolvedValue(0);
    const query = Object.assign(new ListApplicationsQueryDto(), {
      page: 1, pageSize: 20, sortBy: 'appliedAt', sortOrder: 'desc', q: 'sarah',
    });
    await service.findAll(query, 'company-1');
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          candidate: {
            OR: [
              { fullName: { contains: 'sarah', mode: 'insensitive' } },
              { email: { contains: 'sarah', mode: 'insensitive' } },
            ],
          },
        },
      }),
    );
  });

  it('filters by aiFitScore range when scoreMin/scoreMax present', async () => {
    prisma.application.findMany.mockResolvedValue([]);
    prisma.application.count.mockResolvedValue(0);
    const query = Object.assign(new ListApplicationsQueryDto(), {
      page: 1, pageSize: 20, sortBy: 'appliedAt', sortOrder: 'desc', scoreMin: 80, scoreMax: 89,
    });
    await service.findAll(query, 'company-1');
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', aiFitScore: { gte: 80, lte: 89 } },
      }),
    );
  });

  it('filters by multiple stages when stages array is present', async () => {
    prisma.application.findMany.mockResolvedValue([]);
    prisma.application.count.mockResolvedValue(0);
    const query = Object.assign(new ListApplicationsQueryDto(), {
      page: 1, pageSize: 20, sortBy: 'appliedAt', sortOrder: 'desc',
      stages: ['APPLIED', 'INTERVIEW'],
    });
    await service.findAll(query, 'company-1');
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', currentStage: { in: ['APPLIED', 'INTERVIEW'] } },
      }),
    );
  });
});

describe('ApplicationsService.findOne', () => {
  let service: ApplicationsService;
  let prisma: { application: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = { application: { findFirst: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it('returns the application scoped to companyId', async () => {
    const app = { id: 'a1', candidate: { id: 'c1' }, job: { id: 'j1' } };
    prisma.application.findFirst.mockResolvedValue(app);
    const result = await service.findOne('a1', 'company-1');
    expect(prisma.application.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1', companyId: 'company-1' } }),
    );
    expect(result).toBe(app);
  });

  it('throws NotFound when missing or cross-tenant', async () => {
    prisma.application.findFirst.mockResolvedValue(null);
    await expect(service.findOne('a1', 'company-1')).rejects.toThrow('Candidate not found');
  });
});

describe('ApplicationsService.getBoard', () => {
  let service: ApplicationsService;
  let prisma: {
    job: { findFirst: jest.Mock };
    application: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      job: { findFirst: jest.fn() },
      application: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it('404s when the job is not in the company', async () => {
    prisma.job.findFirst.mockResolvedValue(null);
    await expect(service.getBoard('job-x', 'company-1')).rejects.toThrow('Job not found');
    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: { id: 'job-x', companyId: 'company-1' },
      select: { id: true, title: true },
    });
  });

  it('groups applications into zero-filled stages with counts', async () => {
    prisma.job.findFirst.mockResolvedValue({ id: 'job-1', title: 'Backend' });
    prisma.application.findMany.mockResolvedValue([
      { id: 'a1', currentStage: 'APPLIED', aiFitScore: 80, appliedAt: new Date('2026-06-18'),
        candidate: { id: 'c1', fullName: 'Sarah', email: 's@h.com' }, job: { id: 'job-1', title: 'Backend' } },
      { id: 'a2', currentStage: 'APPLIED', aiFitScore: 70, appliedAt: new Date('2026-06-17'),
        candidate: { id: 'c2', fullName: 'Marc', email: 'm@h.com' }, job: { id: 'job-1', title: 'Backend' } },
      { id: 'a3', currentStage: 'HIRED', aiFitScore: 91, appliedAt: new Date('2026-06-10'),
        candidate: { id: 'c3', fullName: 'Alana', email: 'a@h.com' }, job: { id: 'job-1', title: 'Backend' } },
    ]);

    const result = await service.getBoard('job-1', 'company-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', jobId: 'job-1' },
        orderBy: { aiFitScore: 'desc' },
      }),
    );
    expect(result.job).toEqual({ id: 'job-1', title: 'Backend' });
    expect(result.stages.APPLIED).toHaveLength(2);
    expect(result.stages.HIRED).toHaveLength(1);
    expect(result.stages.SCREENED).toEqual([]);
    expect(result.counts).toEqual({ APPLIED: 2, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 1, REJECTED: 0 });
  });
});

describe('ApplicationsService.updateStage', () => {
  let service: ApplicationsService;
  let prisma: {
    application: { findFirst: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      application: { findFirst: jest.fn(), update: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it('404s when the application is not in the company', async () => {
    prisma.application.findFirst.mockResolvedValue(null);
    await expect(service.updateStage('app-x', 'company-1', 'INTERVIEW' as any))
      .rejects.toThrow('Candidate not found');
    expect(prisma.application.findFirst).toHaveBeenCalledWith({
      where: { id: 'app-x', companyId: 'company-1' },
      select: { id: true, currentStage: true },
    });
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it('updates currentStage and returns the list-item row', async () => {
    prisma.application.findFirst.mockResolvedValue({ id: 'app-1', currentStage: 'APPLIED' });
    const updated = {
      id: 'app-1', currentStage: 'INTERVIEW', aiFitScore: 80, appliedAt: new Date('2026-06-18'),
      candidate: { id: 'c1', fullName: 'Sarah', email: 's@h.com' }, job: { id: 'job-1', title: 'Backend' },
    };
    prisma.application.update.mockResolvedValue(updated);

    const result = await service.updateStage('app-1', 'company-1', 'INTERVIEW' as any);

    expect(prisma.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app-1' },
        data: { currentStage: 'INTERVIEW' },
      }),
    );
    expect(result).toEqual(updated);
  });
});

describe('ApplicationsService.getFacets', () => {
  let service: ApplicationsService;
  let prisma: {
    application: { groupBy: jest.Mock; count: jest.Mock };
    job: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      application: { groupBy: jest.fn(), count: jest.fn() },
      job: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it('zero-fills stages and maps job titles', async () => {
    prisma.application.groupBy
      .mockResolvedValueOnce([{ currentStage: 'APPLIED', _count: { _all: 3 } }]) // stages
      .mockResolvedValueOnce([{ jobId: 'j1', _count: { _all: 3 } }]);           // jobs
    prisma.job.findMany.mockResolvedValue([{ id: 'j1', title: 'Backend' }]);
    prisma.application.count.mockResolvedValue(0);

    const result = await service.getFacets('company-1');

    expect(result.stages).toEqual({
      APPLIED: 3, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0,
    });
    expect(result.jobs).toEqual([{ id: 'j1', title: 'Backend', count: 3 }]);
    expect(result.aiFitRanges.unscored).toBe(0);
  });
});
