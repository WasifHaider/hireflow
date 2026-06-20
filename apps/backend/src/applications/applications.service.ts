import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ResumeUrlResponseDto } from './dto/resume-url-response.dto';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

@Injectable()
export class ApplicationsService {
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
    if (query.stage) where.currentStage = query.stage;

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.ApplicationOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where, orderBy, skip, take: query.pageSize,
        select: {
          id: true, currentStage: true, aiFitScore: true, appliedAt: true,
          candidate: { select: { fullName: true, email: true } },
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
}
