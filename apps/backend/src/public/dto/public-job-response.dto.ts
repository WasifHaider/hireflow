import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobType } from '@prisma/client';
import { PublicCompanyBasicDto } from './public-company-response.dto';

/** Job details for GET /public/jobs/:companySlug/:jobId (published jobs only). */
export class PublicJobResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'Product Designer' })
  title!: string;

  @ApiProperty({
    example: 'We are looking for a product designer to shape our hiring experience...',
  })
  description!: string;

  @ApiProperty({
    example: '- 3+ years product design\n- Figma proficiency\n- B2B SaaS experience',
  })
  requirements!: string;

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
