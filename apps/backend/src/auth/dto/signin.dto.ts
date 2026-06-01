import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SigninDto {
  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    return value;
  })
  email!: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password!: string;
}
