import {
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import {
  APPLICATION_SCORING_QUEUE,
  SCORE_APPLICATION_JOB,
} from './application-scoring.constants';
import type {
  ScoreApplicationJobData,
  ScoreApplicationJobResult,
} from './application-scoring.types';
import { MlScoringClient } from './ml-scoring.client';
import { extractPdfText } from './pdf-text.util';

@Processor(APPLICATION_SCORING_QUEUE)
export class ApplicationScoringProcessor {
  private readonly logger = new Logger(ApplicationScoringProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mlClient: MlScoringClient,
  ) {}

  @Process({ name: SCORE_APPLICATION_JOB, concurrency: 3 })
  async handleScoreApplication(
    job: Job<ScoreApplicationJobData>,
  ): Promise<ScoreApplicationJobResult> {
    const { applicationId, resumeStoragePath } = job.data;
    this.logger.log(
      `Scoring application ${applicationId}, attempt ${job.attemptsMade + 1}`,
    );

    // Idempotency: fetch current state + the job description we need to score
    // against. If a prior attempt already scored this row, return early so a
    // retry (or duplicate enqueue) never double-charges OpenAI or overwrites.
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        aiFitScore: true,
        updatedAt: true,
        job: { select: { description: true, requirements: true } },
      },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    if (application.aiFitScore !== null) {
      this.logger.warn(
        `Application ${applicationId} already scored. Skipping.`,
      );
      return {
        applicationId,
        aiFitScore: application.aiFitScore,
        scoredAt: application.updatedAt.toISOString(),
      };
    }

    // --- External reads (kept outside any DB transaction) ---
    // 1. Pull the resume bytes from private storage.
    const pdfBytes = await this.storage.downloadResume(resumeStoragePath);
    // 2. Extract text locally (PDF parsing is CPU work, not an external call).
    const resumeText = await extractPdfText(pdfBytes);

    // Scanned/image-only PDFs yield no extractable text. Embedding empty text
    // would 422 forever, so short-circuit to a 0 score with a reason instead of
    // burning all retry attempts.
    if (!resumeText) {
      this.logger.warn(
        `Application ${applicationId}: no extractable text in resume; scoring 0`,
      );
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          aiFitScore: 0,
          aiScoreDetails: { reason: 'no_extractable_text' },
        },
      });
      return {
        applicationId,
        aiFitScore: 0,
        scoredAt: new Date().toISOString(),
      };
    }

    // Score against title-independent signal: description + requirements.
    const jobText = [application.job.description, application.job.requirements]
      .filter(Boolean)
      .join('\n\n');

    // 3. Ask the Python ml-service (which owns the Groq embedding call) for a score.
    const score = await this.mlClient.score({ resumeText, jobDescription: jobText });
    const aiFitScore = Math.round(score);

    // Final mutation. This is the only write and it happens after all external
    // work succeeds, so there is no external side effect to compensate for if
    // the DB write fails — the job simply throws and Bull retries, with the
    // idempotency guard above preventing a double score.
    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        aiFitScore,
        resumeText,
        aiScoreDetails: {
          model: 'nomic-embed-text-v1.5',
          rawScore: score,
          scoredAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Scored ${applicationId} -> ${aiFitScore}`);

    return {
      applicationId,
      aiFitScore,
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
