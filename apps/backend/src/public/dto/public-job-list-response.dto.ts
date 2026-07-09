import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobType } from '@prisma/client';
import { PublicCompanyBasicDto } from './public-company-response.dto';

/** One row on the global public job board. */
export class PublicJobListItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  title!: string;

  @ApiProperty({ example: 'Remote' })
  location!: string;

  @ApiProperty({ enum: JobType, example: JobType.REMOTE })
  jobType!: JobType;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.FULL_TIME })
  employmentType!: EmploymentType;

  @ApiPropertyOptional({ example: 90000 })
  salaryMin!: number | null;

  @ApiPropertyOptional({ example: 130000 })
  salaryMax!: number | null;

  @ApiProperty({ example: 'USD' })
  salaryCurrency!: string;

  @ApiPropertyOptional({ example: '2026-06-01T12:00:00.000Z' })
  publishedAt!: Date | null;

  @ApiProperty({ type: PublicCompanyBasicDto })
  company!: PublicCompanyBasicDto;
}

/** Paginated response for GET /public/jobs. */
export class PublicJobListResponseDto {
  @ApiProperty({ type: [PublicJobListItemDto] })
  items!: PublicJobListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 12 })
  pageSize!: number;

  @ApiProperty({ example: 4 })
  totalPages!: number;
}
