import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobStatus, JobType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
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

  @ApiPropertyOptional({ example: 'Engineering', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

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
    type: [String],
    example: ['Go', 'gRPC', 'PostgreSQL'],
    description: 'Heavily weighted in AI scoring',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  mustHaveSkills?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Rust', 'Kafka', 'Terraform'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  niceToHaveSkills?: string[];

  @ApiPropertyOptional({ example: 6, minimum: 0, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  minExperienceYears?: number;

  @ApiPropertyOptional({ example: 'BS in CS or related', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  education?: string;

  @ApiPropertyOptional({
    example: 55,
    minimum: 0,
    maximum: 100,
    description: 'Candidates scoring below are auto-moved to Rejected',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  autoRejectScore?: number;

  @ApiPropertyOptional({
    enum: JobStatus,
    example: JobStatus.DRAFT,
    description: 'Defaults to DRAFT in the service when omitted',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
