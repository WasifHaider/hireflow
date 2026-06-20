import { Test } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JobsService.findAll', () => {
  let service: JobsService;
  let prisma: {
    $transaction: jest.Mock;
    job: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      job: { findMany: jest.fn(), count: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(JobsService);
  });

  it('flattens _count.applications to applicationCount on each row', async () => {
    prisma.$transaction.mockResolvedValue([
      [
        { id: 'j1', title: 'A', _count: { applications: 3 } },
        { id: 'j2', title: 'B', _count: { applications: 0 } },
      ],
      2,
    ]);

    const result = await service.findAll(
      { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' } as never,
      'company-1',
    );

    expect(result.total).toBe(2);
    expect(result.data[0]).toEqual({ id: 'j1', title: 'A', applicationCount: 3 });
    expect(result.data[1]).toEqual({ id: 'j2', title: 'B', applicationCount: 0 });
    expect(result.data[0]).not.toHaveProperty('_count');
  });
});
