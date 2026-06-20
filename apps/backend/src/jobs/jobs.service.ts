import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';

export type JobActor = { id: string; companyId: string };

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobDto, user: JobActor) {
    const status = dto.status ?? JobStatus.DRAFT;

    return this.prisma.job.create({
      data: {
        companyId: user.companyId,
        createdById: user.id,
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        department: dto.department,
        location: dto.location,
        jobType: dto.jobType,
        employmentType: dto.employmentType,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency ?? 'USD',
        mustHaveSkills: dto.mustHaveSkills ?? [],
        niceToHaveSkills: dto.niceToHaveSkills ?? [],
        minExperienceYears: dto.minExperienceYears,
        education: dto.education,
        autoRejectScore: dto.autoRejectScore,
        status,
        publishedAt: status === JobStatus.PUBLISHED ? new Date() : undefined,
      },
    });
  }

  async findAll(query: ListJobsQueryDto, companyId: string) {
    // baseWhere = everything EXCEPT status, so faceted counts are stable across tabs.
    const baseWhere: Prisma.JobWhereInput = { companyId, deletedAt: null };

    if (query.search) {
      baseWhere.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.department) baseWhere.department = query.department;
    if (query.location) baseWhere.location = query.location;
    if (query.jobType) baseWhere.jobType = query.jobType;
    if (query.employmentType) baseWhere.employmentType = query.employmentType;
    if (query.ownerId) baseWhere.createdById = query.ownerId;

    const where: Prisma.JobWhereInput = { ...baseWhere };
    if (query.status) where.status = query.status;

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    type GroupedRow = { status: string; _count: { _all: number } };
    type TxResult = [
      Array<{ _count: { applications: number }; createdBy: { id: string; fullName: string; avatarUrl: string | null } } & Record<string, unknown>>,
      number,
      GroupedRow[],
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows, total, grouped] = (await (this.prisma.$transaction as any)([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        include: {
          _count: { select: { applications: true } },
          createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.job.count({ where }),
      this.prisma.job.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ])) as TxResult;

    const counts = { all: 0, DRAFT: 0, PUBLISHED: 0, CLOSED: 0 };
    for (const g of grouped) {
      counts[g.status as keyof typeof counts] = g._count._all;
      counts.all += g._count._all;
    }

    const data = rows.map(({ _count, createdBy, ...job }) => ({
      ...job,
      applicationCount: (_count as { applications: number }).applications,
      owner: createdBy,
    }));

    return {
      data,
      total,
      counts,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }

  async findOne(id: string, companyId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(id: string, dto: UpdateJobDto, companyId: string) {
    const existing = await this.findOne(id, companyId);

    const data: Prisma.JobUpdateInput = { ...dto };

    if (dto.status === JobStatus.PUBLISHED && existing.publishedAt === null) {
      data.publishedAt = new Date();
    }

    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  async getFacets(companyId: string) {
    const rows = await this.prisma.job.findMany({
      where: { companyId, deletedAt: null },
      select: {
        department: true,
        location: true,
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    const departments = [...new Set(rows.map((r) => r.department).filter((d): d is string => !!d))].sort();
    const locations = [...new Set(rows.map((r) => r.location).filter((l): l is string => !!l))].sort();
    const ownersMap = new Map<string, { id: string; fullName: string; avatarUrl: string | null }>();
    for (const r of rows) ownersMap.set(r.createdBy.id, r.createdBy);
    const owners = [...ownersMap.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));

    return { departments, locations, owners };
  }
}
