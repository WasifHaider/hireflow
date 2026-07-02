import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStage } from '@prisma/client';

class DetailCandidateDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) linkedinUrl!: string | null;
}

class DetailJobDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
}

export class ApplicationDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ApplicationStage }) currentStage!: ApplicationStage;
  @ApiProperty({ nullable: true }) aiFitScore!: number | null;
  @ApiProperty({ nullable: true, type: Object }) aiScoreDetails!: unknown;
  @ApiProperty() appliedAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true }) resumeText!: string | null;
  @ApiProperty({ nullable: true }) resumeFilename!: string | null;
  @ApiProperty({ type: DetailCandidateDto }) candidate!: DetailCandidateDto;
  @ApiProperty({ type: DetailJobDto }) job!: DetailJobDto;
}
