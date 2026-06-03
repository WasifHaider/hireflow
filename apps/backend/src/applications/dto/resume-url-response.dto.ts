import { ApiProperty } from '@nestjs/swagger';

export class ResumeUrlResponseDto {
  @ApiProperty({
    example: 'https://oyudgtjlwoqiuemizasp.supabase.co/storage/v1/object/sign/resumes/...',
    description: 'Time-limited signed URL to view the resume PDF',
  })
  signedUrl!: string;

  @ApiProperty({
    example: 300,
    description: 'Seconds until the signed URL expires',
  })
  expiresIn!: number;
}
