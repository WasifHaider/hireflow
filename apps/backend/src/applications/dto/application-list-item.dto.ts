import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';

class ApplicationListCandidateDto {
  @ApiProperty({ example: 'Sarah Chen' })
  fullName!: string;

  @ApiProperty({ example: 'sarah.chen@hey.com' })
  email!: string;
}

class ApplicationListJobDto {
  @ApiProperty({ example: 'b6c1...' })
  id!: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  title!: string;
}

export class ApplicationListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: ApplicationListCandidateDto })
  candidate!: ApplicationListCandidateDto;

  @ApiProperty({ type: ApplicationListJobDto })
  job!: ApplicationListJobDto;

  @ApiProperty({ enum: ApplicationStage })
  currentStage!: ApplicationStage;

  @ApiProperty({ nullable: true, example: 92 })
  aiFitScore!: number | null;

  @ApiProperty()
  appliedAt!: Date;
}

export class ApplicationListResponseDto {
  @ApiProperty({ type: [ApplicationListItemDto] })
  data!: ApplicationListItemDto[];

  @ApiProperty({ example: 284 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 15 })
  totalPages!: number;
}
