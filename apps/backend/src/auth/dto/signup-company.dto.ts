import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

export class SignupCompanyDto {
  @ApiProperty({ example: 'Acme Recruiting', minLength: 2, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  companyName!: string;

  @ApiPropertyOptional({
    example: 'acme-recruiting',
    description:
      'URL-friendly identifier; auto-generated from company name if omitted',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiProperty({ example: 'Jane Doe', minLength: 2, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    return value;
  })
  email!: string;

  @ApiProperty({
    example: 'SecurePass1',
    minLength: 8,
    description: 'At least 8 characters with one letter and one number',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ enum: COMPANY_SIZES, example: '11-50' })
  @IsOptional()
  @IsIn([...COMPANY_SIZES])
  size?: (typeof COMPANY_SIZES)[number];
}
