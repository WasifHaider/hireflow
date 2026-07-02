import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [QueuesModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
