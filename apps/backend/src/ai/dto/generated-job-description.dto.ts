import { ApiProperty } from '@nestjs/swagger';

export class GeneratedJobDescriptionDto {
  @ApiProperty({ example: 'We are looking for an experienced backend engineer...' })
  description!: string;

  @ApiProperty({ example: '- 5+ years Node.js\n- PostgreSQL experience\n- REST API design' })
  requirements!: string;

  @ApiProperty({ type: [String], example: ['Node.js', 'PostgreSQL', 'REST API design'] })
  mustHaveSkills!: string[];
}
