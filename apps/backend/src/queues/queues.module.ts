import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { APPLICATION_SCORING_QUEUE } from './application-scoring/application-scoring.constants';
import { ApplicationScoringProcessor } from './application-scoring/application-scoring.processor';
import { ApplicationScoringProducer } from './application-scoring/application-scoring.producer';
import { MlScoringClient } from './application-scoring/ml-scoring.client';

@Module({
  imports: [
    BullModule.registerQueue({
      name: APPLICATION_SCORING_QUEUE,
    }),
    // 30s timeout: an embeddings round-trip plus network is well under this,
    // but it caps a hung ml-service so the Bull attempt fails and retries.
    HttpModule.register({ timeout: 30000 }),
  ],
  providers: [
    ApplicationScoringProducer,
    ApplicationScoringProcessor,
    MlScoringClient,
  ],
  exports: [ApplicationScoringProducer],
})
export class QueuesModule {}
