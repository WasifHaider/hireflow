import { ApiProperty } from '@nestjs/swagger';

class FacetJobDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() count!: number;
}

class FacetRangesDto {
  @ApiProperty({ name: '90-100' }) '90-100'!: number;
  @ApiProperty({ name: '80-89' }) '80-89'!: number;
  @ApiProperty({ name: '70-79' }) '70-79'!: number;
  @ApiProperty({ name: 'below-70' }) 'below-70'!: number;
  @ApiProperty() unscored!: number;
}

export class ApplicationFacetsDto {
  @ApiProperty({ description: 'Count per stage', example: { APPLIED: 142, SCREENED: 68 } })
  stages!: Record<string, number>;

  @ApiProperty({ type: [FacetJobDto] })
  jobs!: FacetJobDto[];

  @ApiProperty({ type: FacetRangesDto })
  aiFitRanges!: FacetRangesDto;
}
