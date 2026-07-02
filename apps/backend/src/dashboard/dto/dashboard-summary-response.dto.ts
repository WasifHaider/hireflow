import { ApiProperty } from '@nestjs/swagger';

class DashboardStatsDto {
  @ApiProperty({ example: 12 })
  activeJobs!: number;

  @ApiProperty({ example: 284 })
  totalApplications!: number;

  @ApiProperty({ example: 78, description: 'Average aiFitScore across scored applications (0 if none)' })
  avgAiScore!: number;

  @ApiProperty({ example: 31, description: 'Applications still in APPLIED stage' })
  awaitingReview!: number;
}

class PipelineCountsDto {
  @ApiProperty({ example: 142 }) APPLIED!: number;
  @ApiProperty({ example: 68 }) SCREENED!: number;
  @ApiProperty({ example: 24 }) INTERVIEW!: number;
  @ApiProperty({ example: 6 }) OFFER!: number;
  @ApiProperty({ example: 3 }) HIRED!: number;
  @ApiProperty({ example: 9 }) REJECTED!: number;
}

class ApplicationsPerDayDto {
  @ApiProperty({ example: '2026-06-18' })
  date!: string;

  @ApiProperty({ example: 22 })
  count!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: DashboardStatsDto })
  stats!: DashboardStatsDto;

  @ApiProperty({ type: PipelineCountsDto })
  pipeline!: PipelineCountsDto;

  @ApiProperty({ type: [ApplicationsPerDayDto], description: 'Last 7 calendar days, zero-filled' })
  applicationsPerDay!: ApplicationsPerDayDto[];
}
