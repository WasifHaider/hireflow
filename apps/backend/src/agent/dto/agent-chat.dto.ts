import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AgentChatSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class AgentChatDetailDto extends AgentChatSummaryDto {
  @ApiProperty({ type: [Object] })
  messages!: unknown[];
}

export class RenameAgentChatDto {
  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  title!: string;
}
