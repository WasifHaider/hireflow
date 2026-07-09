import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { AuthModule } from '../auth/auth.module';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';

@Module({
  imports: [AuthModule, ApplicationsModule],
  controllers: [CandidateController],
  providers: [CandidateService],
})
export class CandidateModule {}
