import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStage,
  JobStatus,
  Prisma,
} from '@prisma/client';
import { ApplicationScoringProducer } from '../queues/application-scoring/application-scoring.producer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
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
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly scoringProducer: ApplicationScoringProducer,
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

    const { path, size } = await this.storageService.uploadResume({
      companyId: job.companyId,
      jobId: job.id,
      candidateId: candidate.id,
      fileBuffer: resume.buffer,
      originalFilename: resume.originalname,
      mimeType: resume.mimetype,
    });

    try {
      const application = await this.prisma.application.create({
        data: {
          jobId: job.id,
          candidateId: candidate.id,
          companyId: job.companyId,
          coverLetter: dto.coverLetter,
          resumeUrl: path,
          resumeFilename: resume.originalname,
          resumeMimeType: resume.mimetype,
          resumeSizeBytes: size,
          currentStage: ApplicationStage.APPLIED,
        },
      });

      try {
        await this.scoringProducer.enqueueScoreApplication({
          applicationId: application.id,
          jobId: job.id,
          candidateId: candidate.id,
          resumeStoragePath: path,
        });
      } catch (enqueueError) {
        this.logger.error(
          `Failed to enqueue scoring for application ${application.id}`,
          enqueueError instanceof Error ? enqueueError.stack : enqueueError,
        );
      }

      return {
        applicationId: application.id,
        status: 'submitted',
        message: 'Your application has been submitted successfully.',
      };
    } catch (error) {
      await this.storageService.deleteResume(path);

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
