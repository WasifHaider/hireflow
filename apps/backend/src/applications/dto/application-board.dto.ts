import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';
import { ApplicationListItemDto } from './application-list-item.dto';

class BoardJobDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Senior Backend Engineer' }) title!: string;
}

export class ApplicationBoardDto {
  @ApiProperty({ type: BoardJobDto })
  job!: BoardJobDto;

  @ApiProperty({
    description: 'Applications grouped by stage (all six stage keys always present)',
    example: { APPLIED: [], SCREENED: [], INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [] },
  })
  stages!: Record<ApplicationStage, ApplicationListItemDto[]>;

  @ApiProperty({ example: { APPLIED: 6, SCREENED: 4, INTERVIEW: 3, OFFER: 2, HIRED: 1, REJECTED: 17 } })
  counts!: Record<ApplicationStage, number>;
}
