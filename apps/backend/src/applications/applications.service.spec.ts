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
});
