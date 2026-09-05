import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecruiterAuthGuard } from '../auth/guards/recruiter-auth.guard';
import type { SafeUser } from '../auth/types/safe-user.type';
import { AgentChatService } from './agent-chat.service';
import { AgentChatDetailDto, AgentChatSummaryDto, RenameAgentChatDto } from './dto/agent-chat.dto';

@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(RecruiterAuthGuard)
@Controller('agent/chats')
export class AgentChatController {
  constructor(private readonly agentChatService: AgentChatService) {}

  @Get()
  @ApiOperation({ summary: "List the current recruiter's copilot chat threads" })
  @ApiResponse({ status: 200, type: [AgentChatSummaryDto] })
  list(@CurrentUser() user: SafeUser) {
    return this.agentChatService.list(user.companyId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Start a new copilot chat thread' })
  @ApiResponse({ status: 201, type: AgentChatDetailDto })
  create(@CurrentUser() user: SafeUser) {
    return this.agentChatService.create(user.companyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one chat thread with its full transcript' })
  @ApiResponse({ status: 200, type: AgentChatDetailDto })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.agentChatService.findOne(id, user.companyId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a chat thread' })
  @ApiResponse({ status: 200, type: AgentChatSummaryDto })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameAgentChatDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.agentChatService.rename(id, user.companyId, user.id, dto.title);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a chat thread' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    await this.agentChatService.remove(id, user.companyId, user.id);
    return { success: true };
  }
}
