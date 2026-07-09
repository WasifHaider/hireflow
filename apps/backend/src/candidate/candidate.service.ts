import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { ApplicationSubmissionService } from '../applications/application-submission.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyToJobDto } from './dto/apply-to-job.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

const candidateApplicationSelect = {
  id: true,
  currentStage: true,
  aiFitScore: true,
  appliedAt: true,
  resumeFilename: true,
  job: {
    select: {
      id: true,
      title: true,
      location: true,
      jobType: true,
      employmentType: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      publishedAt: true,
      deletedAt: true,
      company: {
        select: {
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
  },
} as const;

const candidateProfileSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  emailVerifiedAt: true,
  createdAt: true,
  _count: { select: { applications: true } },
} as const;

@Injectable()
export class CandidateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: ApplicationSubmissionService,
  ) {}

  async applyToJob(
    candidateId: string,
    dto: ApplyToJobDto,
    resume: Express.Multer.File,
  ) {
    // Published + not soft-deleted only. 404 (not 403) if missing — no leak.
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

    const { applicationId } = await this.submissionService.create({
      job,
      candidateId,
      coverLetter: dto.coverLetter,
      resume,
    });

    return {
      applicationId,
      status: 'submitted' as const,
      message: 'Your application has been submitted successfully.',
    };
  }

  async getProfile(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: candidateProfileSelect,
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const { _count, emailVerifiedAt, ...rest } = candidate;
    return {
      ...rest,
      emailVerified: emailVerifiedAt !== null,
      applicationCount: _count.applications,
    };
  }

  async updateProfile(candidateId: string, dto: UpdateCandidateProfileDto) {
    // undefined keys are ignored by Prisma → only provided fields change.
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
      },
    });

    return this.getProfile(candidateId);
  }

  async findMyApplications(candidateId: string) {
    const applications = await this.prisma.application.findMany({
      where: { candidateId },
      orderBy: { appliedAt: 'desc' },
      select: candidateApplicationSelect,
    });

    // Applications to soft-deleted jobs are kept (the candidate still applied),
    // but surfaced with jobAvailable:false instead of leaking the raw
    // deletedAt timestamp. The frontend renders "no longer available".
    return applications.map(({ job, ...application }) => {
      const { deletedAt, ...jobFields } = job;
      return {
        ...application,
        job: {
          ...jobFields,
          jobAvailable: deletedAt === null,
        },
      };
    });
  }
}
