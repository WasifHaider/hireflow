import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ApplicationsModule } from '../applications/applications.module';
import { AuthModule } from '../auth/auth.module';
import { AgentChatController } from './agent-chat.controller';
import { AgentChatService } from './agent-chat.service';
import { AgentController } from './agent.controller';
import { AgentToolsService } from './agent-tools.service';
import { AgentService } from './agent.service';

@Module({
  imports: [HttpModule, AuthModule, ApplicationsModule, AiModule],
  controllers: [AgentController, AgentChatController],
  providers: [AgentService, AgentToolsService, AgentChatService],
})
export class AgentModule {}
