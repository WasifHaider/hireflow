import {
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import {
  APPLICATION_SCORING_QUEUE,
  SCORE_APPLICATION_JOB,
} from './application-scoring.constants';
import type {
  ScoreApplicationJobData,
  ScoreApplicationJobResult,
} from './application-scoring.types';

@Processor(APPLICATION_SCORING_QUEUE)
export class ApplicationScoringProcessor {
  private readonly logger = new Logger(ApplicationScoringProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process({ name: SCORE_APPLICATION_JOB, concurrency: 3 })
  async handleScoreApplication(
    job: Job<ScoreApplicationJobData>,
  ): Promise<ScoreApplicationJobResult> {
    const { applicationId } = job.data;
    this.logger.log(
      `[STUB] Scoring application ${applicationId}, attempt ${job.attemptsMade + 1}`,
    );

    const existing = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, aiFitScore: true, updatedAt: true },
    });

    if (!existing) {
      throw new Error(`Application ${applicationId} not found`);
    }

    if (existing.aiFitScore !== null) {
      this.logger.warn(
        `Application ${applicationId} already scored. Skipping.`,
      );
      return {
        applicationId,
        aiFitScore: existing.aiFitScore,
        scoredAt: existing.updatedAt.toISOString(),
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const fakeScore = Math.floor(Math.random() * 46) + 50;

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { aiFitScore: fakeScore },
    });

    this.logger.log(`[STUB] Scored ${applicationId} → ${fakeScore}`);

    return {
      applicationId,
      aiFitScore: fakeScore,
      scoredAt: new Date().toISOString(),
    };
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`, err.stack);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: ScoreApplicationJobResult) {
    const durationMs =
      job.processedOn != null ? Date.now() - job.processedOn : 0;
    this.logger.log(`Job ${job.id} completed in ${durationMs}ms`);
  }
}
