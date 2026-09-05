import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateJobDescriptionDto {
  @ApiProperty({ example: 'Senior Backend Engineer', minLength: 2, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Engineering', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}
