import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobStatus, JobType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'salaryRange', async: false })
export class SalaryRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreateJobDto;
    if (dto.salaryMin == null || dto.salaryMax == null) {
      return true;
    }
    return dto.salaryMax >= dto.salaryMin;
  }

  defaultMessage(): string {
    return 'salaryMax must be greater than or equal to salaryMin';
  }
}

export class CreateJobDto {
  @ApiProperty({ example: 'Senior Backend Engineer', minLength: 2, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example:
      'We are looking for an experienced backend engineer to build scalable APIs...',
    minLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description!: string;

  @ApiProperty({
    example: '- 5+ years Node.js\n- PostgreSQL experience\n- REST API design',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  requirements!: string;

  @ApiProperty({ example: 'San Francisco, CA', minLength: 2, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  location!: string;

  @ApiProperty({ enum: JobType, example: JobType.REMOTE })
  @IsEnum(JobType)
  jobType!: JobType;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.FULL_TIME })
  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @ApiPropertyOptional({ example: 120000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ example: 180000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Validate(SalaryRangeConstraint)
  salaryMax?: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'ISO 4217 currency code (3 letters)',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'salaryCurrency must be a 3-letter ISO 4217 code (e.g. USD)',
  })
  salaryCurrency?: string;

  @ApiPropertyOptional({
    enum: JobStatus,
    example: JobStatus.DRAFT,
    description: 'Defaults to DRAFT in the service when omitted',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
