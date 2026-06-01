import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Branding fields safe to show on the public careers page (no tenant secrets). */
export class PublicCompanyBasicDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'Acme Recruiting' })
  name!: string;

  @ApiProperty({ example: 'acme-recruiting' })
  slug!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  logoUrl!: string | null;

  @ApiPropertyOptional({ example: '#2563eb' })
  brandColor!: string | null;
}

/** Company header for GET /public/companies/:companySlug */
export class PublicCompanyResponseDto extends PublicCompanyBasicDto {
  @ApiPropertyOptional({ example: 'Technology' })
  industry!: string | null;
}
