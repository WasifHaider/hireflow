import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';
import {
  APPLICATION_SCORING_QUEUE,
  SCORE_APPLICATION_JOB,
} from './application-scoring.constants';
import type { ScoreApplicationJobData } from './application-scoring.types';

@Injectable()
export class ApplicationScoringProducer {
  constructor(
    @InjectQueue(APPLICATION_SCORING_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueueScoreApplication(data: ScoreApplicationJobData): Promise<void> {
    await this.queue.add(SCORE_APPLICATION_JOB, data, {
      jobId: `score-${data.applicationId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    });
  }
}
