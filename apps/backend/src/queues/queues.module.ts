import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { APPLICATION_SCORING_QUEUE } from './application-scoring/application-scoring.constants';
import { ApplicationScoringProcessor } from './application-scoring/application-scoring.processor';
import { ApplicationScoringProducer } from './application-scoring/application-scoring.producer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: APPLICATION_SCORING_QUEUE,
    }),
  ],
  providers: [ApplicationScoringProducer, ApplicationScoringProcessor],
  exports: [ApplicationScoringProducer],
})
export class QueuesModule {}
