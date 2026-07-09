import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Editable profile fields. email is immutable (login identity) and password
 * has its own flow, so neither is here. Omitted fields are left unchanged;
 * phone / linkedinUrl may be cleared by sending an empty string (→ null).
 */
export class UpdateCandidateProfileDto {
  @ApiPropertyOptional({ example: 'Marcus Johnson', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '+1-555-0100', maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  )
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'https://linkedin.com/in/marcus',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  )
  @IsUrl()
  linkedinUrl?: string | null;
}
