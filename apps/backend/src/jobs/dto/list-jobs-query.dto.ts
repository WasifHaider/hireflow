import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobStatus, JobType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const SORT_BY_FIELDS = ['createdAt', 'title', 'publishedAt'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export type JobSortBy = (typeof SORT_BY_FIELDS)[number];
export type JobSortOrder = (typeof SORT_ORDERS)[number];

export class ListJobsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === '') return 1;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === '') return 20;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    example: 'backend',
    description: 'Case-insensitive match on title or location',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: SORT_BY_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn([...SORT_BY_FIELDS])
  sortBy: JobSortBy = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn([...SORT_ORDERS])
  sortOrder: JobSortOrder = 'desc';

  @ApiPropertyOptional({ description: 'Exact department match' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Exact location match' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: JobType, description: 'Work mode' })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Employment / job type' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Filter by job creator (owner) user id' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
