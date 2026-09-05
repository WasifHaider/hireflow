import { ApiProperty } from '@nestjs/swagger';

class FunnelStageDto {
  @ApiProperty({ example: 'APPLIED' }) stage!: string;
  @ApiProperty({ example: 1247 }) count!: number;
}

class ScoreHistogramBinDto {
  @ApiProperty({ example: '0-9' }) range!: string;
  @ApiProperty({ example: 3 }) count!: number;
}

class TopJobDto {
  @ApiProperty({ example: 'job-uuid' }) id!: string;
  @ApiProperty({ example: 'Senior Backend Engineer' }) title!: string;
  @ApiProperty({ example: 'Engineering', nullable: true }) department!: string | null;
  @ApiProperty({ example: 284 }) applicationCount!: number;
  @ApiProperty({ example: 78, description: 'Average aiFitScore among this job\'s applications (0 if none scored)' })
  avgScore!: number;
  @ApiProperty({ example: 4 }) hires!: number;
}

export class AnalyticsSummaryResponseDto {
  @ApiProperty({ example: 1247 }) totalApplications!: number;
  @ApiProperty({ example: 28 }) hired!: number;

  @ApiProperty({ type: [FunnelStageDto], description: 'All 6 stages, zero-filled, in pipeline order' })
  funnel!: FunnelStageDto[];

  @ApiProperty({ type: [ScoreHistogramBinDto], description: '10 buckets of width 10, zero-filled' })
  scoreHistogram!: ScoreHistogramBinDto[];

  @ApiProperty({ type: [TopJobDto], description: 'Top jobs by application count, most recent 5' })
  topJobs!: TopJobDto[];
}
