import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateApplicationStageDto {
  @ApiProperty({ enum: ApplicationStage, example: ApplicationStage.INTERVIEW })
  @IsEnum(ApplicationStage)
  stage!: ApplicationStage;
}
