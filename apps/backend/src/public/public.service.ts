import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStage,
  JobStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

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

    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const candidate = await tx.candidate.upsert({
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

        return tx.application.create({
          data: {
            jobId: job.id,
            candidateId: candidate.id,
            companyId: job.companyId,
            coverLetter: dto.coverLetter,
            currentStage: ApplicationStage.APPLIED,
          },
        });
      });

      return {
        applicationId: application.id,
        status: 'submitted',
        message: 'Your application has been submitted successfully.',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('You have already applied to this job');
      }
      throw error;
    }
  }
}
