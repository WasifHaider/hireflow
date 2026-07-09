import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Body for POST /candidate/applications (authenticated apply). Identity is
 *  taken from the JWT/candidate record, never from the body. */
export class ApplyToJobDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID of the published job being applied to',
  })
  @IsUUID()
  jobId!: string;

  @ApiPropertyOptional({
    example: 'I am excited about this role because...',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  coverLetter?: string;
}
