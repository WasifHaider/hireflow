import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [ApplicationsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
