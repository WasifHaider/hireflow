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
        location: dto.location,
        jobType: dto.jobType,
        employmentType: dto.employmentType,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency ?? 'USD',
        status,
        publishedAt: status === JobStatus.PUBLISHED ? new Date() : undefined,
      },
    });
  }

  async findAll(query: ListJobsQueryDto, companyId: string) {
    const where: Prisma.JobWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data,
      total,
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
}
