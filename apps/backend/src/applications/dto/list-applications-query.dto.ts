import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const SORT_BY_FIELDS = ['appliedAt', 'aiFitScore'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export type ApplicationSortBy = (typeof SORT_BY_FIELDS)[number];
export type ApplicationSortOrder = (typeof SORT_ORDERS)[number];

export class ListApplicationsQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by job id' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ enum: ApplicationStage })
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  @ApiPropertyOptional({ enum: SORT_BY_FIELDS, default: 'appliedAt' })
  @IsOptional()
  @IsIn([...SORT_BY_FIELDS])
  sortBy: ApplicationSortBy = 'appliedAt';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn([...SORT_ORDERS])
  sortOrder: ApplicationSortOrder = 'desc';
}
