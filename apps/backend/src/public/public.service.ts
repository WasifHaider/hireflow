import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ApplicationSubmissionService } from '../applications/application-submission.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListPublicJobsQueryDto } from './dto/list-public-jobs-query.dto';
import { PublicJobListResponseDto } from './dto/public-job-list-response.dto';
import { PublicCompanyResponseDto } from './dto/public-company-response.dto';
import { PublicJobResponseDto } from './dto/public-job-response.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { SubmitApplicationResponseDto } from './dto/submit-application-response.dto';

const publicCompanySelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  brandColor: true,
  industry: true,
} as const;

const publicCompanyBasicSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  brandColor: true,
} as const;

const publicJobSelect = {
  id: true,
  title: true,
  description: true,
  requirements: true,
  location: true,
  jobType: true,
  employmentType: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  publishedAt: true,
  company: {
    select: publicCompanyBasicSelect,
  },
} as const;

// Lighter select for the global board list — no description/requirements
// (those load on the detail page), keeps the payload small.
const publicJobListSelect = {
  id: true,
  title: true,
  location: true,
  jobType: true,
  employmentType: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  publishedAt: true,
  company: {
    select: publicCompanyBasicSelect,
  },
} as const;

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: ApplicationSubmissionService,
  ) {}

  async getCompanyBySlug(slug: string): Promise<PublicCompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { slug },
      select: publicCompanySelect,
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async listPublicJobs(
    query: ListPublicJobsQueryDto,
  ): Promise<PublicJobListResponseDto> {
    const where: Prisma.JobWhereInput = {
      status: JobStatus.PUBLISHED,
      deletedAt: null,
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.location) where.location = query.location;
    if (query.jobType) where.jobType = query.jobType;
    if (query.employmentType) where.employmentType = query.employmentType;

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: query.pageSize,
        select: publicJobListSelect,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }

  async getPublicJob(
    companySlug: string,
    jobId: string,
  ): Promise<PublicJobResponseDto> {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        status: JobStatus.PUBLISHED,
        deletedAt: null,
        company: { slug: companySlug },
      },
      select: publicJobSelect,
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async submitApplication(
    dto: SubmitApplicationDto,
    resume: Express.Multer.File,
  ): Promise<SubmitApplicationResponseDto> {
    const job = await this.prisma.job.findFirst({
      where: {
        id: dto.jobId,
        status: JobStatus.PUBLISHED,
        deletedAt: null,
      },
      select: { id: true, companyId: true },
    });

    if (!job) {
      throw new NotFoundException(
        'Job not found or no longer accepting applications',
      );
    }

    const candidate = await this.prisma.candidate.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
      },
      update: {
        fullName: dto.fullName,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
      },
    });

    const { applicationId } = await this.submissionService.create({
      job,
      candidateId: candidate.id,
      coverLetter: dto.coverLetter,
      resume,
    });

    return {
      applicationId,
      status: 'submitted',
      message: 'Your application has been submitted successfully.',
    };
  }
}
