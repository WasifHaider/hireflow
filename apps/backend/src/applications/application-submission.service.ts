import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ApplicationStage, Prisma } from '@prisma/client';
import { ApplicationScoringProducer } from '../queues/application-scoring/application-scoring.producer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface CreateApplicationParams {
  job: { id: string; companyId: string };
  candidateId: string;
  coverLetter?: string | null;
  resume: Express.Multer.File;
}

/**
 * Shared core for BOTH apply paths — anonymous public apply and authenticated
 * candidate apply. Owns the cross-service flow: upload resume to storage →
 * create the application row → enqueue AI scoring, with a compensating storage
 * delete if the DB write fails and a 409 on the (jobId, candidateId) unique
 * constraint. Extracted so neither controller duplicates this logic.
 */
@Injectable()
export class ApplicationSubmissionService {
  private readonly logger = new Logger(ApplicationSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly scoringProducer: ApplicationScoringProducer,
  ) {}

  async create(
    params: CreateApplicationParams,
  ): Promise<{ applicationId: string }> {
    const { job, candidateId, coverLetter, resume } = params;

    // Upload happens OUTSIDE any transaction (external service). If the DB
    // write below fails we compensate by deleting the just-uploaded object.
    const { path, size } = await this.storageService.uploadResume({
      companyId: job.companyId,
      jobId: job.id,
      candidateId,
      fileBuffer: resume.buffer,
      originalFilename: resume.originalname,
      mimeType: resume.mimetype,
    });

    try {
      const application = await this.prisma.application.create({
        data: {
          jobId: job.id,
          candidateId,
          companyId: job.companyId,
          coverLetter: coverLetter ?? undefined,
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
          candidateId,
          resumeStoragePath: path,
        });
      } catch (enqueueError) {
        // A failed enqueue must not fail the application — the row exists and
        // scoring can be re-triggered. Log and move on.
        this.logger.error(
          `Failed to enqueue scoring for application ${application.id}`,
          enqueueError instanceof Error ? enqueueError.stack : enqueueError,
        );
      }

      return { applicationId: application.id };
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
