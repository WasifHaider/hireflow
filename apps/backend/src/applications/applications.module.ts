import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueuesModule } from '../queues/queues.module';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [AuthModule, QueuesModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationSubmissionService],
  exports: [ApplicationSubmissionService],
})
export class ApplicationsModule {}
