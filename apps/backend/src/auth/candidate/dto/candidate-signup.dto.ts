import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

const lowercaseEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CandidateSignupDto {
  @ApiProperty({ example: 'marcus@example.com' })
  @IsEmail()
  @Transform(lowercaseEmail)
  email!: string;

  @ApiProperty({
    example: 'SecurePass1',
    description: 'Min 8 chars, must contain at least one letter and one number',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @ApiProperty({ example: 'Marcus Chen' })
  @IsString()
  @Length(2, 100)
  fullName!: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/marcus' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;
}
