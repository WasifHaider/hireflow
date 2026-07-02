import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApplicationStage, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ResumeUrlResponseDto } from './dto/resume-url-response.dto';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { ApplicationFacetsDto } from './dto/application-facets.dto';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationBoardDto } from './dto/application-board.dto';
import { ApplicationListItemDto } from './dto/application-list-item.dto';

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getResumeUrl(
    applicationId: string,
    companyId: string,
  ): Promise<ResumeUrlResponseDto> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, companyId },
      select: { resumeUrl: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (!application.resumeUrl) {
      throw new NotFoundException('No resume on file');
    }

    const signedUrl = await this.storageService.getSignedUrl(
      application.resumeUrl,
      SIGNED_URL_EXPIRES_IN_SECONDS,
    );

    return {
      signedUrl,
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    };
  }

  async findAll(query: ListApplicationsQueryDto, companyId: string) {
    const where: Prisma.ApplicationWhereInput = { companyId };
    if (query.jobId) where.jobId = query.jobId;
    if (query.stages?.length) where.currentStage = { in: query.stages };
    else if (query.stage) where.currentStage = query.stage;
    if (query.q) {
      where.candidate = {
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      };
    }
    if (query.scoreMin != null || query.scoreMax != null) {
      const range: Prisma.IntNullableFilter = {};
      if (query.scoreMin != null) range.gte = query.scoreMin;
      if (query.scoreMax != null) range.lte = query.scoreMax;
      where.aiFitScore = range;
    }

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.ApplicationOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where, orderBy, skip, take: query.pageSize,
        select: {
          id: true, currentStage: true, aiFitScore: true, appliedAt: true,
          candidate: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data, total, page: query.page, pageSize: query.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }

  async findOne(id: string, companyId: string): Promise<ApplicationDetailDto> {
    const application = await this.prisma.application.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        currentStage: true,
        aiFitScore: true,
        aiScoreDetails: true,
        appliedAt: true,
        updatedAt: true,
        resumeText: true,
        resumeFilename: true,
        candidate: { select: { id: true, fullName: true, email: true, phone: true, linkedinUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Candidate not found');
    }

    return application as ApplicationDetailDto;
  }

  async getBoard(jobId: string, companyId: string): Promise<ApplicationBoardDto> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true, title: true },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const apps = await this.prisma.application.findMany({
      where: { companyId, jobId },
      orderBy: { aiFitScore: 'desc' },
      select: {
        id: true, currentStage: true, aiFitScore: true, appliedAt: true,
        candidate: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    const stages = {
      APPLIED: [], SCREENED: [], INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [],
    } as Record<ApplicationStage, typeof apps>;
    const counts = {
      APPLIED: 0, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0,
    } as Record<ApplicationStage, number>;

    for (const app of apps) {
      stages[app.currentStage].push(app);
      counts[app.currentStage] += 1;
    }

    return { job, stages, counts } as ApplicationBoardDto;
  }

  async updateStage(
    id: string,
    companyId: string,
    stage: ApplicationStage,
  ): Promise<ApplicationListItemDto> {
    const existing = await this.prisma.application.findFirst({
      where: { id, companyId },
      select: { id: true, currentStage: true },
    });
    if (!existing) {
      throw new NotFoundException('Candidate not found');
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { currentStage: stage },
      select: {
        id: true, currentStage: true, aiFitScore: true, appliedAt: true,
        candidate: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    this.logger.log(
      `Application ${id} stage ${existing.currentStage} -> ${stage} (company ${companyId})`,
    );
    return updated as ApplicationListItemDto;
  }

  async getFacets(companyId: string): Promise<ApplicationFacetsDto> {
    const where: Prisma.ApplicationWhereInput = { companyId };
    const [stageGrouped, jobGrouped, jobs, r90, r80, r70, rbelow, unscored] =
      await Promise.all([
        this.prisma.application.groupBy({ by: ['currentStage'], where, _count: { _all: true } }),
        this.prisma.application.groupBy({ by: ['jobId'], where, _count: { _all: true } }),
        this.prisma.job.findMany({ where: { companyId, deletedAt: null }, select: { id: true, title: true } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 90 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 80, lte: 89 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 70, lte: 79 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: { gte: 0, lte: 69 } } }),
        this.prisma.application.count({ where: { ...where, aiFitScore: null } }),
      ]);

    const stages: Record<string, number> = {
      APPLIED: 0, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0,
    };
    for (const g of stageGrouped) {
      stages[g.currentStage] = g._count._all;
    }

    const titleById = new Map(jobs.map((j) => [j.id, j.title]));
    const jobsFacet = jobGrouped
      .filter((g) => titleById.has(g.jobId))
      .map((g) => ({ id: g.jobId, title: titleById.get(g.jobId) as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    return {
      stages,
      jobs: jobsFacet,
      aiFitRanges: {
        '90-100': r90, '80-89': r80, '70-79': r70, 'below-70': rbelow, unscored,
      },
    };
  }
}
