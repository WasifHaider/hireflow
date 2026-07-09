import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Query for the global public job board — GET /public/jobs. */
export class ListPublicJobsQueryDto {
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

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === '') return 12;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 12;

  @ApiPropertyOptional({
    example: 'engineer',
    description: 'Case-insensitive match on title or location',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  q?: string;

  @ApiPropertyOptional({ description: 'Exact location match' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  location?: string;

  @ApiPropertyOptional({ enum: JobType, description: 'Work mode' })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Employment type' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
}
