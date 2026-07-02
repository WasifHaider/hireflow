import { ApiProperty } from '@nestjs/swagger';

export class SubmitApplicationResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  applicationId!: string;

  @ApiProperty({ example: 'submitted' })
  status!: 'submitted';

  @ApiProperty({ example: 'Your application has been submitted successfully.' })
  message!: string;
}
